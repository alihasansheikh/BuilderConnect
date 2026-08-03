-- V39: Honest blog seed copy
-- 1) Drop the dead example.com cover images seeded in V16 (public blog renders broken <img> otherwise).
-- 2) The hiring-tips post recommended the escrow subsystem removed in V34 — replace that tip
--    with copy matching the real milestone direct-payment model.
-- 3) The escrow post is entirely about the removed subsystem — unpublish it.

UPDATE blog_posts
SET cover_image_url = NULL
WHERE cover_image_url IN (
    'https://example.com/blog/hiring-contractor.jpg',
    'https://example.com/blog/construction-costs.jpg',
    'https://example.com/blog/escrow-guide.jpg'
);

UPDATE blog_posts
SET content = REPLACE(
    content,
    '<h2>6. Use Escrow Payments</h2><p>Protect your investment with milestone-based escrow payments. Never pay the full amount upfront.</p>',
    '<h2>6. Pay Milestone by Milestone</h2><p>Pay each milestone directly as it is completed and keep proof of payment on record — the builder confirms receipt before the next stage begins. Never pay the full amount upfront.</p>'
)
WHERE slug = 'top-10-tips-hiring-contractor-pakistan';

UPDATE blog_posts
SET status = 'DRAFT', is_published = FALSE
WHERE slug = 'escrow-payments-protect-your-investment';
