export const getters = {
  // user
  user: state => state.user, // (Object) all user data

  // PRODUCTS
  products: state => state.products,
  singleProduct: state => state.singleProduct,
  lastVisible: state => state.lastVisible,
  productFilters: state => state.productFilters,
  algoliaSearchText: state => state.algoliaSearchText,
  productStatistics: state => state.productStatistics,
  PRODUCT_TREE: state => state.PRODUCT_TREE,

  // ORDERS
  orders: state => state.orders,
  orderStatistics: state => state.orderStatistics,
  confirmationObj: state => state.confirmationObj,
  ORDER_STATUSES: state => state.ORDER_STATUSES,
  PAYMENT_METHODS: state => state.PAYMENT_METHODS,
  PAYMENT_STATUSES: state => state.PAYMENT_STATUSES,
  PAYMENT_TYPES: state => state.PAYMENT_TYPES,
  DELIVERY_METHODS: state => state.DELIVERY_METHODS,
  DISCOUNT_TYPES: state => state.DISCOUNT_TYPES,

  // COMPANY INFO
  companyInfo: state => state.companyInfo,

  // REVIEWS
  reviews: state => state.reviews,
  reviewStatistics: state => state.reviewStatistics,
  REVIEW_STATUSES: state => state.REVIEW_STATUSES,

  // DICTIONARIES
  dictionaries: state => state.dictionaries,

  // SYSTEM
  IS_ADMIN: state => state.IS_ADMIN, // (Boolean) current user is admin?
  ADMINS: state => state.ADMINS, // (Array) list of admin emails
  LOADING: state => state.LOADING, // (Boolean) global loading flag
  ERR: state => state.ERR // (Object) global error object
}
