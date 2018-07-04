import firebase, {auth, db, fs, GoogleProvider} from "../services/fireinit";
import {Message, Notification} from 'element-ui'
import algoliasearch from 'algoliasearch'

const ALGOLIA_APP_ID = '895KFYHFNM'
const ALGOLIA_SEARCH_KEY = '743fdead3dcea56354ccfbf001d370ca'
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_SEARCH_KEY)

export const actions = {

  nuxtServerInit ({ dispatch }, { req }) {
    return Promise.all([
      dispatch('fetchCompanyInfo'), // for footer
      dispatch('fetchProductStatistics'),
      dispatch('fetchDictionaries')
    ])
  },
  // PRODUCTS
  async loadSingleProduct({commit, getters, dispatch}, payload) {
    await fs.collection('products').doc(payload).get()
      .then(snap => {
        commit('setSingleProduct', {...snap.data()})
        console.log('(i) Single product loaded')
      })
      .catch(err => dispatch('LOG', err))
  },

  // watch: 'Просмотр товара'
  // cart: 'Добавление в корзину'
  // checkout: 'Покупка товара'
  async increaseProductCounter({commit, getters, dispatch}, payload) {
    db.ref('productCounters').child(payload.id).once('value', snap => {
      db.ref('productCounters').child(payload.id)
        .update({
          [payload.type]: snap.val() && snap.val()[payload.type] ? snap.val()[payload.type] + 1 : 1
        })
    })
  },

  async fetchProductCounters({commit}) {
    db.ref('productCounters').once('value', snap => {
      console.log('(i) Fetched: product counters')
      commit('setProductCounters', snap.val())
    })
  },

  async fetchProducts({commit, getters, dispatch}) {
    commit('LOADING', true)
    let params = $nuxt.$route.params
    let filter = getters.productCommonFilters
    let query = fs.collection('products')
    if (filter.maxPrice && !filter.category) { // all if category
      query = query
        .where('price', '>=', filter.minPrice)
        .where('price', '<=', filter.maxPrice)
    }
    if (params.group) {
      query = query.where('group', '==', params.group)
    }
    if (params.category) {
      query = query.where('category', '==', params.category)
    }
    query = query.orderBy('price', 'asc')
    if (getters.lastVisible) {
      query = query.startAfter(getters.lastVisible)
    }
    if (filter.limit && !params.category) {
      query = query.limit(filter.limit)
    }

    await query.get()
      .then((snap) => {
        let products = {}
        if (getters.lastVisible && !params.category && params.group === filter.group) {
          products = getters.products ? getters.products : {}
        }
        if (params.category) { // group only have load more
          commit('setLastVisible', null)
        } else {
          commit('setLastVisible', snap.size === filter.limit ? snap.docs[snap.docs.length - 1] : null)
        }

        snap.docs.forEach(doc => {
          products[doc.id] = doc.data()
        })
        commit('setProducts', {...products})
        commit('setProductDynamicFilters', '') // dynamic filters work in client side only for categories
        commit('setDynamicFilteredProductsIds', '') // dynamic filters work in client side only for categories
        commit('updateProductCommonFilter', {field: 'group', value: params.group})
        commit('updateProductCommonFilter', {field: 'category', value: params.category})
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  async fetchAdminProducts({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    await fs.collection('products')
      .where('group', '==', payload.group)
      .where('category', '==', payload.category)
      .orderBy('price', 'asc')
      .get()
      .then(snap => {
        let products = {}
        snap.docs.forEach(doc => {
          products[doc.id] = doc.data()
        })
        commit('setProducts', {...products})
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },


  createDynamicFilteredProductIds({commit, getters}) { // client
    let products = getters.products ? getters.products : {}
    let dynFilter = getters.productDynamicFilters
    let filteredProductIds = []
    for (let pId in products) {
      let i = 0
      for (let prop in dynFilter) {
        if (dynFilter[prop].indexOf(products[pId][prop]) !== -1) {
          i++
        }
      }
      if (Object.keys(dynFilter).length === i) { // all props exists
        filteredProductIds.push(pId)
      }
    }
    commit('setDynamicFilteredProductsIds', filteredProductIds)
  },

  async setProductCommonFilters({commit, getters}, payload) {
    commit('setProductCommonFilters', await payload)
  },

  async updateProductCommonFilter({commit, getters}, payload) {
    commit('updateProductCommonFilter', await payload)
  },

  async setSelectedCatalogNode({commit, getters}, payload) {
    commit('setSelectedCatalogNode', await payload)
  },

  async setProductDynamicFilters({commit, getters}, payload) {
    commit('setProductDynamicFilters', await payload)
  },

  async setDynamicFilteredProductsIds({commit, getters}, payload) {
    commit('setDynamicFilteredProductsIds', await payload)
  },

  runAlgoliaSearch({commit}, payload) {
    let index
    if (process.env.NODE_ENV === 'production') {
      index = client.initIndex('DEV_SANTEHNIKA')
    } else if (process.env.NODE_ENV === 'development') {
      index = client.initIndex('DEV_SANTEHNIKA')
    }
    return index.search({query: payload}).then(resp => resp.hits)
  },

  async setLastVisible({commit}, payload) {
    await commit('setLastVisible', payload)
  },
  async setAlgoliaSearchText({commit}, payload) {
    await commit('algoliaSearchText', payload)
  },
  async addNewProduct({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    let products = getters.products ? getters.products : {}
    let updateData
    await fs.collection('products').add(payload)
      .then(snap => {
        updateData = {
          // add productId field for quick access anywhere
          productId: snap.id,
          // Cloud function fill up it!
          img_0: {original: '', thumbnail: '', card: ''},
          img_1: {original: '', thumbnail: '', card: ''},
          img_2: {original: '', thumbnail: '', card: ''},
          img_3: {original: '', thumbnail: '', card: ''},
          img_4: {original: '', thumbnail: '', card: ''}
        }
        let newProduct = {[snap.id]: Object.assign(updateData, payload)}
        products = Object.assign(newProduct, products)
        return fs.collection('products').doc(snap.id).update(updateData)
      })
      .then(() => {
        commit('setProducts', {...products})
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  async editProduct({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    let products = getters.products
    await fs.collection('products').doc(payload.productId).update(payload)
      .then(() => {
        products[payload.productId] = payload
        commit('setProducts', {...products})
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  editProductImage({commit, dispatch}, payload) {
    commit('LOADING', true)
    dispatch('subscribeToSubImagesCreation', payload.productId)
    let images = payload.images
    let uploadImage = function (name, image) {
      return firebase.storage().ref('products/' + payload.productId + '/' + name).put(image)
    }
    let actions = []
    for (let img in images) {
      actions.push(uploadImage(img, images[img]))
    }
    return Promise.all(actions)
      .then(() => {
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },
  subscribeToSubImagesCreation({commit, getters}, payload) { // realtime change images
    let products = getters.products
    fs.collection('products').doc(payload)
      .onSnapshot(doc => {
        products[doc.id] = doc.data()
        commit('setProducts', {...products})
      })
  },
  deleteProduct({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    let products = getters.products
    fs.collection('products').doc(payload).delete()
      .then(() => {
        let product = products[payload]
        let images = [] // images names
        for (let i = 0; i < 5; i++) {
          if (product['img_' + i].original !== '') {
            images.push('img_' + i)
            images.push('card_img_' + i)
            images.push('thumb_img_' + i)
          }
        }
        let deleteImage = function (name) {
          return firebase.storage().ref('products/' + payload + '/' + name).delete()
        }
        let actions = images.map(deleteImage)
        return Promise.all(actions)
      })
      .then(() => {
        delete products[payload]
        commit('setProducts', {...products})
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },


  async fetchProductStatistics({commit, dispatch}) {
    await fs.collection('statistics').doc('products').get()
      .then(snap => {
        console.log('(i) Statistics: for products')
        commit('productStatistics', snap.data())
      })
      .catch(err => dispatch('LOG', err))
  },


  // ORDERS
  fetchOrders:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      let query = fs.collection('orders')
      if (payload.userId) {
        query = query.where('buyer.userId', '==', payload.userId)
      }
      if (payload.status) {
        query = query.where('status', '==', payload.status)
      }
      let orders = {}
      query.orderBy('history.created', 'desc').get()
        .then(snap => {
          snap.docs.forEach(doc => {
            orders[doc.id] = doc.data()
            orders[doc.id].id = doc.id
            orders[doc.id].showDetails = false // for collapse details
          })
          commit('setOrders', {...orders})
          commit('LOADING', false)
        })
        .catch(err => dispatch('LOG', err))
    },


  subscribeToOrderModification:
    ({commit, getters, dispatch}, payload) => {
      let orders = getters.orders ? getters.orders : {}
      return fs.collection('orders').doc(payload)
        .onSnapshot(function (doc) {
          console.log('(i) Order changed')
          let order = doc.data()
          order.id = doc.id
          orders[doc.id] = order
          orders[doc.id].showDetails = false // for collapse details
          commit('setOrders', {...orders})
        })
    },


  async checkout({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    let user = getters.user
    let orders = getters.orders ? getters.orders : {}
    await fs.collection('orders').add(payload)
      .then((docRef) => {
        payload.id = docRef.id
        orders[docRef.id] = payload
        orders[docRef.id].showDetails = false
        let actions = []
        // 1. Decrease totalQty of each products
        let decreaseQty = function (id, totalQty) {
          return fs.collection('products').doc(id).update({totalQty: totalQty})
        }
        let productQty = 0
        payload.products.forEach(el => {
          productQty = user.cart[el.id].totalQty
          delete user.cart[el.id]
          actions.push(decreaseQty(el.id, productQty - el.qty > 0 ? productQty - el.qty : 0))
        })
        // 2. Update user data
        let orderIds = Object.keys(orders)
        let cartProductIds = user.cart ? Object.keys(user.cart) : []
        let updateUserData = function (cart, orderIds) {
          return fs.collection('users').doc(user.uid).update({cart: cart, orders: orderIds})
        }
        actions.push(updateUserData(cartProductIds, orderIds))
        return Promise.all(actions)
      })
      .then(() => {
        commit('setOrders', {...orders})
        // user.orders = {...orders}s
        // commit('setUser', {...user})
        commit('LOADING', false)
        Notification({
          title: 'Поздравляем!',
          message:
            'Заказ совершен! ' +
            'Мы свяжемся с Вами в ближайшее время для подтверждения покупки.',
          type: 'success',
          showClose: true,
          duration: 30000,
          offset: 50
        })
        $nuxt.$router.push('/cart')
      })
      .catch(err => dispatch('LOG', err))
  },


  updateOrder:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      fs.collection('orders').doc(payload.id).update(payload.updateData)
        .then(() => {
          if (payload.updateData.isChangedStatus) {
            let orders = getters.orders
            delete orders[payload.id]
            commit('setOrders', {...orders})
          }
          console.log('(i) Order updated')
          commit('LOADING', false)
        })
        .catch(err => dispatch('LOG', err))
    },
  fetchOrderStatistics:
    ({commit, dispatch}) => {
      fs.collection('statistics').doc('orders').get()
        .then(snapshot => {
          console.log('(i) Statistics: for orders')
          commit('orderStatistics', snapshot.data())
        })
        .catch(err => dispatch('LOG', err))
    },
  setConfirmationObj({commit}, payload) {
    commit('setConfirmationObj', payload)
  },


  // user
  // user DATA = full firebase auth.currentUser object + app data keeping in firestore db
  fetchUserData({commit, dispatch, getters}, payload) {
    commit('LOADING', true)
    let user = {} // auth object read only, copy them
    return fs.collection('users').doc(payload.uid).get()
      .then(snap => {
        user.uid = payload.uid
        user.email = payload.email
        user.isAnonymous = payload.isAnonymous
        user.emailVerified = payload.emailVerified
        user.favorites = snap.data().favorites
        user.firstname = snap.data().firstname
        user.lastname = snap.data().lastname
        user.orders = snap.data().orders
        user.cart = snap.data().cart
        user.role = snap.data().role
        commit('setUser', user)
        return Promise.all([
          dispatch('setAdmin'),
          dispatch('loadOwnProducts'),
          dispatch('fetchOrders', {userId: user.uid})
        ])
      })
      .then(() => {
        commit('LOADING', false)
        console.log('(i) Fetched: all user data')
      })
      .catch(err => dispatch('LOG', err))
  },

  editPersonalInfo({commit, getters, dispatch}, payload) {
    commit('LOADING', true)
    let user = getters.user
    fs.collection('users').doc(user.uid).update(payload)
      .then(() => {
        commit('setUser', Object.assign(user, payload))
        commit('LOADING', false)
        console.log('(i) Personal info updated!')
      })
      .catch(err => dispatch('LOG', err))
  },

  signUpWithEmailAndPassword({commit, dispatch}, payload) {
    commit('ERR', null)
    commit('LOADING', true)
    dispatch('upgradeAnonymousAccount', payload)
      .then(() => {
        Notification({
          title: 'Поздравляем',
          message: 'Аккаунт был успешно создан!',
          type: 'success',
          showClose: true,
          duration: 10000,
          offset: 50
        })
        $nuxt.$router.push('/account')
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  upgradeAnonymousAccount({commit, dispatch}, payload) {
    let credential = firebase.auth.EmailAuthProvider.credential(payload.email, payload.password)
    auth.currentUser.linkWithCredential(credential)
      .then(user => {
        dispatch('fetchUserData', user)
        user.sendEmailVerification() // TODO: verification link may be expired, force resend
        console.log('(i) User register. Email verification sent.')
        console.log('(i) Anonymous account successfully upgraded', user)
        return Promise.all([
          fs.collection('users').doc(user.uid)
            .update({
              email: payload.email,
              firstname: payload.firstname,
              lastname: payload.lastname,
              emailVerified: user.emailVerified,
              isAnonymous: false
            }),
          // db.ref(`liveChats/${user.uid}/props`).update({userEmail: user.email})
        ])
      })
      .catch(err => dispatch('LOG', err))
  },


  signInWithGoogle({commit}) {
    return new Promise((resolve, reject) => {
      auth.signInWithRedirect(GoogleProvider)
      $nuxt.$router.push('/account')
      resolve()
    })
  },

  signOut({commit}) {
    auth.signOut().then(() => {
      commit('setUser', null)
    }).catch(err => console.log(err))
  },

  signInWithEmailAndPassword({commit, dispatch}, payload) {
    commit('ERR', '')
    commit('LOADING', true)
    auth.signInAndRetrieveDataWithEmailAndPassword(payload.email, payload.password)
      .then(() => { // onAuthStateChanged works
        console.log('(i) >> Successful Login')
        $nuxt.$router.push('/account')
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  signInAnonymously:
  // All users initially register as anonymous
    ({commit, dispatch}) => {
      commit('setUser', {cart: [], orders: []})
      firebase.auth().signInAnonymously() // TODO: deprecated - replace by signInAnonymously()
        .then((data) => { // onAuthStateChanged works
          return fs.collection('users').doc(data.user.uid)
            .set({ // initialize user for quick update
              role: 'guest',
              cart: [],
              orders: [],
              favorites: []
            })
        })
        .then(() => {
          console.log('(i) >> You are sign in anonymously')
        })
        .catch(err => dispatch('LOG', err))
    },

  updateEmailVerification:
    ({commit, dispatch}, payload) => {
      fs.collection('users').doc(payload.uid)
        .update({emailVerified: payload.emailVerified})
        .catch(err => dispatch('LOG', err))
    },

  logout({dispatch, commit}) {
    auth.signOut()
      .then(() => {
        commit('setUser', '')
        commit('ERR', '')
        $nuxt.$router.push('/account')
      })
      .catch(err => dispatch('LOG', err))
  },

  resetPassword:
    ({commit, dispatch}, payload) => {
      commit('ERR', null)
      auth.sendPasswordResetEmail(payload)
        .then(function () {
          Notification({
            title: 'Внимание',
            message: `На почту ${payload} отправлено письмо для восстановления пароля!`,
            type: 'info',
            showClose: true,
            duration: 20000,
            offset: 50
          })
        })
        .catch(function (err) {
          let errorCode = err.code
          let errorMessage = err.message
          if (errorCode === 'auth/invalid-email') {
            Message({type: 'error', showClose: true, message: errorMessage, duration: 10000})
          } else if (errorCode === 'auth/user-not-found') {
            Message({type: 'error', showClose: true, message: errorMessage, duration: 10000})
          }
          dispatch('LOG', err)
        })
    },
  updateOwnProducts:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      const user = getters.user
      const subject = payload.subject // cart or favorites
      let pId = payload.product.productId
      if (payload.operation === 'add') {
        user[subject][pId] = payload.product
      } else if (payload.operation === 'remove') {
        delete user[subject][pId]
      }
      let productIds = []
      if (user[subject]) {
        productIds = Object.keys(user[subject])
      }
      commit('setUser', {...user}) // not good, but visual fast
      fs.collection('users').doc(user.uid).update({[subject]: productIds})
        .then(() => {
          commit('LOADING', false)
        })
        .catch(err => dispatch('LOG', err))
    },
  loadOwnProducts: // cart and favorites
    ({commit, getters, dispatch}) => {
      let user = getters.user
      let cart = {}
      let favorites = {}
      let loadProduct = function (pId, to) {
        return fs.collection('products').doc(pId).get()
          .then(snap => {
            if (to === 'cart' && snap.data()) { // !snap.data() === product removed
              cart[pId] = snap.data()
            } else if (to === 'favorites' && snap.data()) {
              favorites[pId] = snap.data()
            }
          })
      }
      let actions = []
      if (user.cart) {
        user.cart.forEach(pId => actions.push(loadProduct(pId, 'cart')))
      }
      if (user.favorites) {
        user.favorites.forEach(pId => actions.push(loadProduct(pId, 'favorites')))
      }
      return Promise.all(actions)
        .then(() => {
          user.cart = cart
          user.favorites = favorites
          commit('setUser', {...user})
          console.log('(i) Fetched: user cart products')
        })
        .catch(err => dispatch('LOG', err))
    },
  async setAdmin({commit, getters}) {
    commit('setAdmin', await getters.ADMINS.indexOf(getters.user.email) !== -1)
  },

  async fetchAllUsers({commit, getters, dispatch}) {
    commit('LOADING', true)
    let users = {}
    await fs.collection('users').get()
      .then(snap => {
        snap.docs.forEach(doc => {
          users[doc.id] = doc.data()
        })
      })
      .catch(err => dispatch('LOG', err))

    await db.ref('events').once('value', snap => {
      for (let userId in snap.val()) {
        if (users[userId]) {
          users[userId].events = snap.val()[userId]
        }
      }
    })
    await commit('setAllUsers', {...users})
    commit('LOADING', false)
    console.log('(i) Fetched: all users from firestore');
  },


  // DICTIONARIES
  async fetchDictionaries({commit, dispatch}) {
    commit('LOADING', true)
    await fs.collection('dictionaries').get()
      .then(snapshot => {
        let docs = snapshot.docs
        docs.forEach(doc => {
          commit('setDictionary', {name: doc.id, data: doc.data().all})
        })
        console.log('(i) Fetched: dictionaries')
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },


  uploadDictionary:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      let name = payload.name
      delete payload.dictionary
      fs.collection('dictionaries').doc(name).set({all: payload.data})
        .then(() => {
          commit('setDictionary', {name: payload.name, data: payload.data})
          commit('LOADING', false)
          console.log('(i) Dictionary updated')
        })
        .catch(err => dispatch('LOG', err))
    },

  // COMPANY INFO
  fetchCompanyInfo:
    ({commit, dispatch}) => {
      commit('LOADING', true)
      fs.collection('companyInfo').get()
        .then(snap => {
          let companyInfo = {}
          snap.docs.forEach(doc => {
            companyInfo[doc.id] = doc.data()
          })
          commit('setCompanyInfo', {...companyInfo})
          console.log('(i) Fetched: company info')
          commit('LOADING', false)
        })
        .catch(err => dispatch('LOG', err))
    },


  updateCompanyInfo:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      let companyInfo = getters.companyInfo
      fs.collection('companyInfo').doc(payload.document)
        .update({[payload.field]: payload.value})
        .then(() => {
          companyInfo[payload.document][payload.field] = payload.value
          console.log('(i) Company info updated')
          commit('setCompanyInfo', {...companyInfo})
          commit('LOADING', false)
        })
        .catch(err => dispatch('LOG', err))
    },


  // REVIEWS
  fetchReviews:
    ({commit, dispatch}, payload) => {
      commit('LOADING', true)
      let query = fs.collection('reviews')
      if (payload.status) {
        query = query.where('status', '==', payload.status)
      }
      query.get()
        .then(snapshot => {
          let reviews = {}
          snapshot.docs.forEach(doc => {
            reviews[doc.id] = doc.data()
            reviews[doc.id].id = doc.id
          })
          commit('setReviews', {...reviews})
          commit('LOADING', false)
          console.log('(i) Fetched: reviews')
        })
        .catch(err => dispatch('LOG', err))
    },
  addReview:
    ({commit, getters, dispatch}, payload) => {
      commit('LOADING', true)
      payload.user.id = getters.user.uid
      let image = payload.user.avatar
      payload.user.avatar = '' // will be updated as image url later
      let avatarRef
      let reviewId = ''
      fs.collection('reviews').add(payload)
        .then((snap) => {
          reviewId = snap.id
          avatarRef = firebase.storage().ref('reviews/' + reviewId + '/avatar').put(image)
          return avatarRef
        })
        .then(() => {
          avatarRef.snapshot.ref.getDownloadURL().then(downloadURL => {
            return fs.collection('reviews').doc(reviewId).update({'user.avatar': downloadURL})
          });
        })
        .then(() => {
          commit('LOADING', false)
          console.log('(i) Review added')
          Notification({
            title: 'Спасибо',
            message: 'Ваш отзыв будет опубликован после прохождения модерации!',
            type: 'success',
            showClose: true,
            duration: 10000,
            offset: 50
          })
        })
        .catch(err => dispatch('LOG', err))
    },
  updateReview:
    ({commit, dispatch, getters}, payload) => {
      commit('LOADING', true)
      fs.collection('reviews').doc(payload.id).update(payload.updateData)
        .then(() => {
          if (payload.updateData.isChangedStatus) {
            let reviews = getters.reviews
            delete reviews[payload.id]
            commit('setReviews', {...reviews})
          }
          commit('LOADING', false)
          console.log('(i) Review updated')
        })
        .catch(err => dispatch('LOG', err))
    },
  fetchReviewStatistics:
    ({commit, dispatch}) => {
      fs.collection('statistics').doc('reviews').get()
        .then(snapshot => {
          console.log('(i) Statistics: for reviews')
          commit('reviewStatistics', snapshot.data())
        })
        .catch(err => dispatch('LOG', err))
    },


  // REVIEWS
  async sendCallRequests({commit, dispatch, getters}, payload) {
    payload.date = new Date().getTime()
    payload.user.id = getters.user.uid
    payload.status = 'created'
    await fs.collection('userRequests').add(payload)
      .then(() => {
        Notification({
          title: 'Спасибо',
          message: 'Ваша заявка доставлена, мы свяжемся с вами в ближайшее время!',
          type: 'success',
          showClose: true,
          duration: 10000,
          offset: 50
        })
      })
  },

  async fetchRequests({commit, dispatch}, payload) {
    commit('LOADING', true)
    let query = fs.collection('userRequests')
    if (payload.status) {
      query = query.where('status', '==', payload.status)
    }
    query.get()
      .then(snap => {
        let requests = {}
        snap.docs.forEach(doc => {
          requests[doc.id] = doc.data()
          requests[doc.id].id = doc.id
        })
        commit('setRequests', {...requests})
        commit('LOADING', false)
        console.log('(i) Fetched: user requests')
      })
      .catch(err => dispatch('LOG', err))
  },

  async updateRequest({commit, dispatch, getters}, payload) {
    commit('LOADING', true)
    await fs.collection('userRequests').doc(payload.id).update(payload.updateData)
      .then(() => {
        if (payload.updateData.isChangedStatus) {
          let requests = getters.requests
          delete requests[payload.id]
          commit('setRequests', {...requests})
        }
        commit('LOADING', false)
        console.log('(i) Requests updated')
      })
      .catch(err => dispatch('LOG', err))
  },

  fetchRequestsStatistics:
    ({commit, dispatch}) => {
      fs.collection('statistics').doc('userRequests').get()
        .then(snapshot => {
          console.log('(i) Statistics: for user requests')
          commit('setRequestsStatistics', snapshot.data())
        })
        .catch(err => dispatch('LOG', err))
    },



  // QUESTIONS
  fetchQuestions({commit, dispatch}) {
    commit('LOADING', true)
    fs.collection('questions').get()
      .then(snap => {
        let questions = {}
        snap.docs.forEach(doc => {
          questions[doc.id] = doc.data()
          questions[doc.id].id = doc.id
        })
        commit('setQuestions', {...questions})
        console.log('(i) Fetched: questions')
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  createQuestion({commit, dispatch, getters}, payload) {
    commit('LOADING', true)
    payload.date = new Date().getTime()
    fs.collection('questions').add(payload)
      .then((snap) => {
        let questions = getters.questions ? getters.questions : {}
        questions[snap.id] = payload
        questions[snap.id].id = snap.id
        commit('setQuestions', {...questions})
        console.log('(i) Added: new question')
        commit('LOADING', false)
      })
      .catch(err => dispatch('LOG', err))
  },

  updateQuestion({commit, dispatch, getters}, payload) {
    commit('LOADING', true)
    fs.collection('questions').doc(payload.id).update(payload.updateData)
      .then(() => {
        let questions = getters.questions
        let question = questions[payload.id]
        questions[payload.id] = Object.assign(question, payload.updateData)
        commit('setQuestions', {...questions})
        commit('LOADING', false)
        console.log('(i) Updated: question')
      })
      .catch(err => dispatch('LOG', err))
  },

  deleteQuestion({commit, dispatch, getters}, payload) {
    commit('LOADING', true)
    fs.collection('questions').doc(payload).delete()
      .then(() => {
        let questions = getters.questions
        delete questions[payload]
        commit('setQuestions', {...questions})
        commit('LOADING', false)
        console.log('(i) Removed: question')
      })
  },


    // USER EVENTS
  USER_EVENT:
    ({commit, getters, dispatch}, payload) => {
      if (!getters.user.uid) return
      let newEvent = {
        name: payload,
        date: new Date().getTime()
      }
      db.ref('events').child(getters.user.uid).push(newEvent)
        .catch(err => dispatch('LOG', err))
    },

  // APP
  ERR({commit}, payload) {
    commit('ERR', payload)
  },
  ANCHOR({commit}, payload) {
    commit('ANCHOR', payload)
  },
  LOADING({commit}, payload) {
    commit('LOADING', payload)
  },
  LOG({commit}, payload) {
    console.log(payload)
    commit('ERR', payload)
    commit('LOADING', false)
    if (payload.code !== 'aborted') { // offline client
      firebase.database().ref('errLog').push({
        time: new Date().getTime(),
        data: payload.stack ? payload.stack : payload
      })
    }
  }
}
