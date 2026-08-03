import { formatCurrency } from '@/lib/formatters'
import type { MaterialOrderItem } from '@/types'

interface OrderItemsTableProps {
  items: MaterialOrderItem[]
  subtotal: number
  taxAmount: number
  deliveryFee: number
  totalAmount: number
}

/**
 * Line items + totals for a material order. Shared between the buyer order detail
 * and the supplier orders page so both roles read the same breakdown.
 */
export function OrderItemsTable({
  items,
  subtotal,
  taxAmount,
  deliveryFee,
  totalAmount,
}: OrderItemsTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground dark:border-gray-700">
            <th className="py-2 pr-4 font-medium">Item</th>
            <th className="py-2 pr-4 font-medium">Quantity</th>
            <th className="py-2 text-right font-medium">Line total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b last:border-b-0 dark:border-gray-700/60">
              <td className="py-3 pr-4">
                <p className="font-medium text-gray-900 dark:text-white">
                  {item.materialName || `Material #${item.materialId}`}
                </p>
                {item.materialSku && (
                  <p className="mt-0.5 text-xs text-muted-foreground">SKU: {item.materialSku}</p>
                )}
              </td>
              <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                {item.quantity} × {formatCurrency(item.unitPrice)}
                {item.unitOfMeasure && (
                  <span className="text-muted-foreground"> per {item.unitOfMeasure}</span>
                )}
              </td>
              <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                {formatCurrency(item.totalPrice)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={2} className="pt-4 text-right text-muted-foreground">
              Subtotal
            </td>
            <td className="pt-4 text-right text-gray-900 dark:text-gray-200">
              {formatCurrency(subtotal)}
            </td>
          </tr>
          {taxAmount > 0 && (
            <tr>
              <td colSpan={2} className="pt-1.5 text-right text-muted-foreground">
                Tax
              </td>
              <td className="pt-1.5 text-right text-gray-900 dark:text-gray-200">
                {formatCurrency(taxAmount)}
              </td>
            </tr>
          )}
          {deliveryFee > 0 && (
            <tr>
              <td colSpan={2} className="pt-1.5 text-right text-muted-foreground">
                Delivery fee
              </td>
              <td className="pt-1.5 text-right text-gray-900 dark:text-gray-200">
                {formatCurrency(deliveryFee)}
              </td>
            </tr>
          )}
          <tr>
            <td colSpan={2} className="pt-2 text-right font-semibold text-gray-900 dark:text-white">
              Total
            </td>
            <td className="pt-2 text-right text-base font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
