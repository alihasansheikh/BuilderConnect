package com.builderconnect.service;

import com.builderconnect.dto.request.ContractDraftRequest;
import com.builderconnect.dto.response.ContractResponse;
import com.builderconnect.dto.response.ContractVersionResponse;
import com.builderconnect.entity.Contract;
import com.builderconnect.entity.ContractVersion;
import com.builderconnect.entity.Milestone;
import com.builderconnect.entity.Project;
import com.builderconnect.entity.User;
import com.builderconnect.enums.ContractStatus;
import com.builderconnect.enums.MilestoneStatus;
import com.builderconnect.enums.NotificationType;
import com.builderconnect.enums.ProjectStatus;
import com.builderconnect.enums.UserRole;
import com.builderconnect.exception.BadRequestException;
import com.builderconnect.exception.ResourceNotFoundException;
import com.builderconnect.exception.UnauthorizedException;
import com.builderconnect.repository.ContractRepository;
import com.builderconnect.util.SecurityUtils;
import com.builderconnect.repository.ContractVersionRepository;
import com.builderconnect.repository.MilestoneRepository;
import com.builderconnect.repository.ProjectRepository;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Optional;

/**
 * Service for contract lifecycle management.
 *
 * Product flow: after award the BUILDER authors the contract (total locked to the
 * accepted bid), it stays editable until either party signs, and once both sign
 * the project moves to IN_PROGRESS (milestones are created by the builder afterwards).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ContractService {

    private final ContractRepository contractRepository;
    private final ContractVersionRepository contractVersionRepository;
    private final ProjectRepository projectRepository;
    private final MilestoneRepository milestoneRepository;
    private final AuditService auditService;
    private final NotificationService notificationService;

    private static final String DEFAULT_TERMS = """
            1. The Builder agrees to complete the scope of work as described in this contract.
            2. The Client pays each milestone directly to the Builder after approving the completed work, and the Builder confirms receipt on the platform.
            3. Either party may request dispute resolution through the BuilderConnect platform.
            4. Work must be completed according to local building codes and regulations.
            5. The Builder must maintain appropriate safety standards at all times.
            6. Communication regarding the project should be conducted through the platform.
            7. Any changes to the scope must be agreed upon by both parties in writing.
            """;

    /** PDF payload plus the contract number the controller uses for the download filename. */
    public record ContractPdfFile(String contractNumber, byte[] content) {}

    /**
     * Builder authors the contract for an awarded project. The total amount is
     * SERVER-SET from the awarded budget — never taken from the request.
     */
    @Transactional
    public ContractResponse createContract(User builder, Long projectId, ContractDraftRequest request) {
        SecurityUtils.validateNotSuspended(builder);
        Project project = loadProject(projectId);
        requireAwardedBuilder(builder, project);

        if (project.getStatus() != ProjectStatus.AWARDED && project.getStatus() != ProjectStatus.CONTRACT_PENDING) {
            throw new BadRequestException(
                    "A contract can only be drafted for an awarded project (current status: "
                            + project.getStatus() + ")");
        }
        if (contractRepository.existsByProjectId(projectId)) {
            throw new BadRequestException("Contract already drafted");
        }
        if (project.getFinalBudget() == null) {
            throw new BadRequestException("Project has no awarded amount — award a bid before drafting the contract");
        }
        validateDates(request);

        Contract contract = Contract.builder()
                .contractNumber(generateContractNumber())
                .project(project)
                .client(project.getClient())
                .builder(project.getAwardedBuilder())
                .totalAmount(project.getFinalBudget())
                .scopeOfWork(request.getScopeOfWork())
                .paymentTerms(request.getPaymentTerms())
                .termsAndConditions(request.getTermsAndConditions() != null ? request.getTermsAndConditions() : DEFAULT_TERMS)
                .specialClauses(request.getSpecialClauses())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(ContractStatus.PENDING_CLIENT)
                .build();

        contract = contractRepository.save(contract);
        log.info("Contract {} drafted by builder {} for project {}",
                contract.getContractNumber(), builder.getId(), projectId);

        auditService.logAction(builder, "CONTRACT_DRAFTED", "CONTRACT", contract.getId(),
                "Drafted contract " + contract.getContractNumber() + " for project " + project.getTitle());
        notificationService.createNotification(project.getClient(), NotificationType.SYSTEM_ANNOUNCEMENT,
                "Contract ready for review",
                builder.getName() + " has drafted the contract for \"" + project.getTitle()
                        + "\". Review and sign it to move forward.",
                "CONTRACT", contract.getId(), "/client/projects/" + projectId);

        return ContractResponse.fromEntity(contract);
    }

    /**
     * Builder edits contract terms. Allowed only while NO party has signed.
     * The total amount is never updated from the request.
     */
    @Transactional
    public ContractResponse updateContract(User builder, Long projectId, ContractDraftRequest request) {
        SecurityUtils.validateNotSuspended(builder);
        Project project = loadProject(projectId);
        requireAwardedBuilder(builder, project);

        Contract contract = contractRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found for project: " + projectId));

        if (contract.getClientSignedAt() != null || contract.getBuilderSignedAt() != null) {
            throw new BadRequestException("Contract can no longer be edited (already signed)");
        }
        validateDates(request);

        // Snapshot the pre-edit state so the version history keeps every revision
        createVersion(builder, projectId, "Auto-snapshot before edit");

        contract.setScopeOfWork(request.getScopeOfWork());
        contract.setPaymentTerms(request.getPaymentTerms());
        contract.setTermsAndConditions(request.getTermsAndConditions());
        contract.setSpecialClauses(request.getSpecialClauses());
        contract.setStartDate(request.getStartDate());
        contract.setEndDate(request.getEndDate());

        contract = contractRepository.save(contract);
        log.info("Contract {} updated by builder {} for project {}",
                contract.getContractNumber(), builder.getId(), projectId);

        auditService.logAction(builder, "CONTRACT_UPDATED", "CONTRACT", contract.getId(),
                "Updated contract " + contract.getContractNumber());

        return ContractResponse.fromEntity(contract);
    }

    /**
     * Sign a contract. Validates that the signer is a party to the contract.
     */
    @Transactional
    public ContractResponse signContract(User signer, Long projectId, String ipAddress) {
        Contract contract = contractRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found for project: " + projectId));

        if (!contract.getStatus().canBeSigned()) {
            throw new BadRequestException("Contract cannot be signed in current status: " + contract.getStatus().getDisplayName());
        }

        boolean isClient = contract.getClient().getId().equals(signer.getId());
        boolean isBuilder = contract.getBuilder().getId().equals(signer.getId());

        if (!isClient && !isBuilder) {
            throw new UnauthorizedException("You are not a party to this contract");
        }
        SecurityUtils.validateNotSuspended(signer);

        applySignature(contract, signer, isClient, projectId, ipAddress);
        contract = contractRepository.save(contract);

        if (contract.isFullySigned()) {
            startProject(contract, projectId);
            notifyFullySigned(contract, projectId);
        } else {
            notifyCounterpartySigned(contract, isClient, projectId);
        }

        auditService.logAction(signer, "CONTRACT_SIGNED", "CONTRACT", contract.getId(),
                "Signed contract " + contract.getContractNumber());

        return ContractResponse.fromEntity(contract);
    }

    private void applySignature(Contract contract, User signer, boolean isClient,
                                Long projectId, String ipAddress) {
        if (isClient) {
            if (contract.getClientSignedAt() != null) {
                throw new BadRequestException("You have already signed this contract");
            }
            contract.signByClient(ipAddress);
            log.info("Client {} signed contract {} for project {}",
                    signer.getName(), contract.getContractNumber(), projectId);
        } else {
            if (contract.getBuilderSignedAt() != null) {
                throw new BadRequestException("You have already signed this contract");
            }
            contract.signByBuilder(ipAddress);
            log.info("Builder {} signed contract {} for project {}",
                    signer.getName(), contract.getContractNumber(), projectId);
        }
    }

    /**
     * Both parties signed: move the project to IN_PROGRESS. NULL-SAFE for milestones —
     * in the builder-authored flow milestones are created AFTER signing, so when none
     * exist yet the project simply starts with currentMilestoneId left null.
     */
    private void startProject(Contract contract, Long projectId) {
        Project project = contract.getProject();
        project.start();
        List<Milestone> milestones = milestoneRepository.findByProjectIdOrderBySequenceOrderAsc(project.getId());
        if (!milestones.isEmpty() && milestones.get(0).getStatus() == MilestoneStatus.PENDING) {
            Milestone first = milestones.get(0);
            first.start();
            milestoneRepository.save(first);
            project.setCurrentMilestoneId(first.getId());
        }
        projectRepository.save(project);
        log.info("Contract {} fully signed — project {} started", contract.getContractNumber(), projectId);
    }

    private void notifyCounterpartySigned(Contract contract, boolean clientSigned, Long projectId) {
        String projectTitle = contract.getProject().getTitle();
        if (clientSigned) {
            notificationService.createNotification(contract.getBuilder(), NotificationType.SYSTEM_ANNOUNCEMENT,
                    "Contract signed by client",
                    contract.getClient().getName() + " signed the contract for \"" + projectTitle
                            + "\". Your signature is required to activate it.",
                    "CONTRACT", contract.getId(), "/builder/projects/" + projectId);
        } else {
            notificationService.createNotification(contract.getClient(), NotificationType.SYSTEM_ANNOUNCEMENT,
                    "Contract signed by builder",
                    contract.getBuilder().getName() + " signed the contract for \"" + projectTitle
                            + "\". Your signature is required to activate it.",
                    "CONTRACT", contract.getId(), "/client/projects/" + projectId);
        }
    }

    private void notifyFullySigned(Contract contract, Long projectId) {
        String title = "Contract fully signed";
        String message = "The contract for \"" + contract.getProject().getTitle()
                + "\" has been signed by both parties. The project is now in progress.";
        notificationService.createNotification(contract.getClient(), NotificationType.SYSTEM_ANNOUNCEMENT,
                title, message, "CONTRACT", contract.getId(), "/client/projects/" + projectId);
        notificationService.createNotification(contract.getBuilder(), NotificationType.SYSTEM_ANNOUNCEMENT,
                title, message, "CONTRACT", contract.getId(), "/builder/projects/" + projectId);
    }

    /**
     * Get contract for a specific project. Access limited to the project client,
     * the awarded builder, or admins.
     */
    @Transactional(readOnly = true)
    public Optional<ContractResponse> getContractByProject(User user, Long projectId) {
        Project project = loadProject(projectId);
        validatePartyAccess(user, project);
        return contractRepository.findByProjectId(projectId)
                .map(ContractResponse::fromEntity);
    }

    /**
     * Render the contract as a PDF (iText 7). Access limited to the contract parties or admins.
     */
    @Transactional(readOnly = true)
    public ContractPdfFile generateContractPdf(User user, Long projectId) {
        Project project = loadProject(projectId);
        validatePartyAccess(user, project);
        Contract contract = contractRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found for project: " + projectId));

        byte[] content = renderContractPdf(contract);
        log.info("Contract PDF generated: number={}, project={}", contract.getContractNumber(), projectId);
        return new ContractPdfFile(contract.getContractNumber(), content);
    }

    private byte[] renderContractPdf(Contract contract) {
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        PdfDocument pdf = new PdfDocument(new PdfWriter(baos));
        Document doc = new Document(pdf);

        doc.add(new Paragraph("BuilderConnect").setBold().setFontSize(22f));
        doc.add(new Paragraph("CONSTRUCTION CONTRACT").setFontSize(13f).setBold());
        doc.add(new Paragraph("Contract #: " + safe(contract.getContractNumber())));
        doc.add(new Paragraph("Status: " + contract.getStatus().getDisplayName()));
        doc.add(new Paragraph("Project: " + safe(contract.getProject().getTitle())));

        Table parties = new Table(new float[]{1, 2}).useAllAvailableWidth().setMarginTop(12f);
        parties.addCell("Client");
        parties.addCell(partyLine(contract.getClient()));
        parties.addCell("Builder");
        parties.addCell(partyLine(contract.getBuilder()));
        parties.addCell("Total Amount (PKR)");
        parties.addCell(contract.getTotalAmount() != null ? contract.getTotalAmount().toPlainString() : "0.00");
        parties.addCell("Start Date");
        parties.addCell(safe(contract.getStartDate()));
        parties.addCell("End Date");
        parties.addCell(safe(contract.getEndDate()));
        doc.add(parties);

        addSection(doc, "Scope of Work", contract.getScopeOfWork());
        addSection(doc, "Payment Terms", contract.getPaymentTerms());
        addSection(doc, "Terms and Conditions", contract.getTermsAndConditions());
        addSection(doc, "Special Clauses", contract.getSpecialClauses());
        addSignatureSection(doc, contract);

        doc.close();
        return baos.toByteArray();
    }

    private void addSection(Document doc, String heading, String body) {
        if (body == null || body.isBlank()) {
            return;
        }
        doc.add(new Paragraph("\n" + heading).setBold().setFontSize(12f));
        doc.add(new Paragraph(body).setFontSize(10f));
    }

    private void addSignatureSection(Document doc, Contract contract) {
        doc.add(new Paragraph("\nSignatures").setBold().setFontSize(12f));
        Table signatures = new Table(new float[]{1, 2}).useAllAvailableWidth();
        signatures.addCell("Client");
        signatures.addCell(signatureLine(contract.getClientSignedAt()));
        signatures.addCell("Builder");
        signatures.addCell(signatureLine(contract.getBuilderSignedAt()));
        doc.add(signatures);
        doc.add(new Paragraph("\nGenerated by BuilderConnect.").setFontSize(9f).setItalic());
    }

    private static String signatureLine(LocalDateTime signedAt) {
        return signedAt != null ? "Signed at " + signedAt : "Not signed yet";
    }

    private static String partyLine(User user) {
        if (user == null) {
            return "";
        }
        return safe(user.getName()) + " <" + safe(user.getEmail()) + ">";
    }

    private static String safe(Object value) {
        return value != null ? value.toString() : "";
    }

    /**
     * Create a version snapshot of the current contract state.
     */
    @Transactional
    public ContractVersionResponse createVersion(User user, Long projectId, String changeSummary) {
        SecurityUtils.validateNotSuspended(user);
        Project project = loadProject(projectId);
        validatePartyAccess(user, project);
        Contract contract = contractRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found for project: " + projectId));

        int nextVersion = contractVersionRepository.getMaxVersionNumber(contract.getId()) + 1;

        ContractVersion version = ContractVersion.builder()
                .contract(contract)
                .versionNumber(nextVersion)
                .scopeOfWork(contract.getScopeOfWork())
                .termsAndConditions(contract.getTermsAndConditions())
                .totalAmount(contract.getTotalAmount())
                .startDate(contract.getStartDate())
                .endDate(contract.getEndDate())
                .changeSummary(changeSummary)
                .createdBy(user)
                .build();

        version = contractVersionRepository.save(version);

        auditService.logAction(user, "CONTRACT_VERSION_CREATED", "CONTRACT", contract.getId(),
                "Created version " + nextVersion + " for contract " + contract.getContractNumber());

        log.info("Contract version {} created for contract {} by user {}",
                nextVersion, contract.getContractNumber(), user.getId());

        return ContractVersionResponse.fromEntity(version);
    }

    /**
     * Get version history for a contract. Access limited to the contract parties or admins.
     */
    @Transactional(readOnly = true)
    public List<ContractVersionResponse> getVersionHistory(User user, Long projectId) {
        Project project = loadProject(projectId);
        validatePartyAccess(user, project);
        Contract contract = contractRepository.findByProjectId(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Contract not found for project: " + projectId));

        return contractVersionRepository.findByContractIdOrderByVersionNumberDesc(contract.getId())
                .stream()
                .map(ContractVersionResponse::fromEntity)
                .toList();
    }

    private Project loadProject(Long projectId) {
        return projectRepository.findByIdAndDeletedFalse(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
    }

    private void requireAwardedBuilder(User user, Project project) {
        boolean isAwardedBuilder = project.getAwardedBuilder() != null
                && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isAwardedBuilder) {
            throw new UnauthorizedException("Only the awarded builder can author this project's contract");
        }
    }

    private void validatePartyAccess(User user, Project project) {
        if (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.SUPER_ADMIN) {
            return;
        }
        boolean isProjectClient = project.getClient() != null
                && project.getClient().getId().equals(user.getId());
        boolean isAwardedBuilder = project.getAwardedBuilder() != null
                && project.getAwardedBuilder().getId().equals(user.getId());
        if (!isProjectClient && !isAwardedBuilder) {
            throw new UnauthorizedException("You don't have access to this project's contract");
        }
    }

    private void validateDates(ContractDraftRequest request) {
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new BadRequestException("End date must be after start date");
        }
    }

    private String generateContractNumber() {
        String prefix = "CON-" + Year.now().getValue() + "-";
        Long nextNumber = contractRepository.getNextContractNumber(prefix);
        return String.format("%s%05d", prefix, nextNumber);
    }
}
