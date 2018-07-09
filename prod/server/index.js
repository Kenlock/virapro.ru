// TO SWITCH prod/dev:
// $ firebase use prod/dev

// *******************
// SSR FUNCTION
// *******************
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {Nuxt} = require('nuxt');
const express = require('express');
const app = express();
admin.initializeApp();
const config = {
    dev: false,
    debug: true,
    buildDir: 'nuxt',
    build: {
        vendor: ['element-ui', 'firebase'],
        publicPath: '/assets/',
        presets: ['es2015', 'stage-0'],
    }
}
const nuxt = new Nuxt(config);

function handleRequest(req, res) {
    // TODO: max-age ~ 600sec
    // TODO: add CPU power to this function
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600');
    return new Promise((resolve, reject) => {
        nuxt.render(req, res, promise => {
            promise.then(resolve).catch(reject)
        })
    });
}

app.use(handleRequest);
exports.nuxtssr = functions.https.onRequest(app);

// *******************
// ALL CLOUD FUNCTIONS
// *******************
// STORAGE
const createProductSubImages = require('./src/storage/createProductSubImages')
// DATABASE
const updateProductStatistics = require('./src/db/products/updateProductStatistics')
const updateOrdersStatistics = require('./src/db/orders/updateOrdersStatistics')
const sendOrderNotification = require('./src/db/orders/sendOrderNotification')
const updateReviewsStatistics = require('./src/db/reviews/updateReviewsStatistics')
const sendRequestNotification = require('./src/db/userRequests/sendRequestNotification')
const updateRequestsStatistics = require('./src/db/userRequests/updateRequestsStatistics')
const sendReviewNotification = require('./src/db/reviews/sendReviewNotification')
const updateAlgoliaIndex = require('./src/db/products/updateAlgoliaIndex')
const deleteAlgoliaIndex = require('./src/db/products/deleteAlgoliaIndex')
// GLOBAL CONST
global.CONST = require('./src/common/constants')
// firebase functions:config:set app.production="1/0"
// firebase functions:config:set algolia.app_id="<YOUR-ALGOLIA-APP-ID>"
// firebase functions:config:set algolia.api_key="<YOUR-ALGOLIA-ADMIN-KEY>"
// firebase functions:config:set algolia.product_idx="<YOUR-ALGOLIA-PRODUCT-IDX-NAME>" // 'PROD_SANTEHNIKA', "DEV_SANTEHNIKA"

// firebase functions:config:set admin.email="santehnika.nsk@gmail.com"
// firebase functions:config:set admin.password="***"
// firebase functions:config:set developer.email="SmelayaPandaGM@gmail.com"
// firebase functions:config:set developer.password="***"
global.IS_PRODUCTION = Number(functions.config().app.production) // 1 - true (prod), 0 - false (dev)
global.ADMIN_EMAIL = functions.config().admin.email
global.ADMIN_PASS = functions.config().admin.password
global.DEVELOPER_EMAIL = functions.config().developer.email
global.DEVELOPER_PASS = functions.config().developer.password
global.ALGOLIA_ID = functions.config().algolia.app_id;
global.ALGOLIA_ADMIN_KEY = functions.config().algolia.api_key;
global.ALGOLIA_INDEX_NAME = functions.config().algolia.product_idx;

let nodemailer = require('nodemailer')
// Can be only one transporter instance
let mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: ADMIN_EMAIL,
        pass: ADMIN_PASS
    }
});
// STORAGE
exports.createProductSubImages = functions
    .storage.object()
    .onFinalize((object, context) => {
        return createProductSubImages.handler(object, context, admin)
    })

// DATABASE
// Now, product updated after insertion (.onWrite not necessary)
// product
exports.onUpdateProduct = functions.firestore
    .document('products/{productId}')
    .onUpdate((change, context) => {
        return Promise.all([
            updateProductStatistics.handler(change, context, admin),
            updateAlgoliaIndex.handler(change, context, functions)
        ])
    })
exports.onDeleteProduct = functions.firestore
    .document('products/{productId}')
    .onDelete((change, context) => {
        return deleteAlgoliaIndex.handler(change, context, functions)
    })
// order
exports.onCreateOrder = functions.firestore
    .document('orders/{orderId}')
    .onCreate((snap, context) => {
        return sendOrderNotification.handler(snap, context, mailTransporter)
    })
exports.onWriteOrder = functions.firestore
    .document('orders/{orderId}')
    .onWrite((change, context) => {
        return updateOrdersStatistics.handler(change, context, admin)
    })
// review
exports.onCreateReview = functions.firestore
    .document('reviews/{reviewId}')
    .onCreate((snap, context) => {
        return sendReviewNotification.handler(snap, context, mailTransporter)
    })
exports.onWriteReview = functions.firestore
    .document('reviews/{reviewId}')
    .onWrite((change, context) => {
        return updateReviewsStatistics.handler(change, context, admin)
    })
// user requests
exports.onCreateUserRequest = functions.firestore
    .document('userRequests/{requestId}')
    .onCreate((snap, context) => {
        return sendRequestNotification.handler(snap, context, mailTransporter)
    })
exports.onWriteUserRequest = functions.firestore
    .document('userRequests/{requestId}')
    .onWrite((change, context) => {
        return updateRequestsStatistics.handler(change, context, admin)
    })