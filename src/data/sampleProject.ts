import type { ProjectGraph } from '../graph/types.ts'

export const sampleProject: ProjectGraph = {
  name: 'Sample: EC Order',
  nodes: [
    { id: 'req-order', type: 'requirement', name: 'ユーザーが商品を注文できる' },
    { id: 'req-history', type: 'requirement', name: 'ユーザーが注文履歴を確認できる' },
    { id: 'api-post-orders', type: 'api', name: 'POST /orders' },
    { id: 'api-get-orders', type: 'api', name: 'GET /orders' },
    { id: 'uc-create-order', type: 'usecase', name: '注文を作成する', description: 'カートの商品から注文を確定し、決済する' },
    { id: 'uc-view-history', type: 'usecase', name: '注文履歴を見る' },
    {
      id: 'entity-order',
      type: 'entity',
      name: 'Order',
      description: '合計金額は明細から計算する',
      fields: ['id', 'userId', 'items', 'totalAmount', 'status'],
    },
    { id: 'db-orders', type: 'database', name: 'orders', fields: ['id', 'user_id', 'total_amount', 'status', 'ordered_at'] },
    { id: 'db-order-items', type: 'database', name: 'order_items', fields: ['id', 'order_id', 'product_id', 'quantity'] },
    { id: 'ext-payment', type: 'external', name: '決済サービス' },
  ],
  edges: [
    { id: 'e1', source: 'req-order', target: 'uc-create-order' },
    { id: 'e2', source: 'req-history', target: 'uc-view-history' },
    { id: 'e3', source: 'api-post-orders', target: 'uc-create-order' },
    { id: 'e4', source: 'api-get-orders', target: 'uc-view-history' },
    { id: 'e5', source: 'uc-create-order', target: 'entity-order' },
    { id: 'e6', source: 'uc-view-history', target: 'entity-order' },
    { id: 'e7', source: 'uc-create-order', target: 'db-orders', kind: 'writes' },
    { id: 'e8', source: 'uc-create-order', target: 'db-order-items', kind: 'writes' },
    { id: 'e9', source: 'uc-view-history', target: 'db-orders', kind: 'reads' },
    { id: 'e10', source: 'uc-create-order', target: 'ext-payment', note: '決済を確定' },
  ],
}
