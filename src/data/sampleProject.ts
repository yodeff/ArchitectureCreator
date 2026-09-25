import type { Project } from '../graph/types.ts'

export const sampleProject: Project = {
  name: 'Sample: EC',
  pages: [
    {
      id: 'page-order',
      name: '注文',
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
    },
    {
      id: 'page-member',
      name: '会員',
      nodes: [
        { id: 'req-sign-up', type: 'requirement', name: 'ユーザーが会員登録できる' },
        { id: 'api-post-users', type: 'api', name: 'POST /users' },
        { id: 'uc-sign-up', type: 'usecase', name: '会員登録する', description: '登録後に確認メールを送る' },
        { id: 'entity-user', type: 'entity', name: 'User', fields: ['id', 'email', 'name'] },
        { id: 'db-users', type: 'database', name: 'users', fields: ['id', 'email', 'name', 'created_at'] },
        { id: 'ext-mail', type: 'external', name: 'メール送信サービス' },
      ],
      edges: [
        { id: 'e1', source: 'req-sign-up', target: 'uc-sign-up' },
        { id: 'e2', source: 'api-post-users', target: 'uc-sign-up' },
        { id: 'e3', source: 'uc-sign-up', target: 'entity-user' },
        { id: 'e4', source: 'uc-sign-up', target: 'db-users', kind: 'writes' },
        { id: 'e5', source: 'uc-sign-up', target: 'ext-mail', note: '確認メール' },
      ],
    },
  ],
}
