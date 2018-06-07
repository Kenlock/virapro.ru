module.exports = {
  /*
   ** Headers of the page
   */
  head: {
    title: 'Nuxtjs SSR Firebase Functions',
    meta: [
      {charset: 'utf-8'},
      {name: 'viewport', content: 'width=device-width, initial-scale=1'},
      {hid: 'description', name: 'description', content: 'Nuxt.js project'},
      {name: 'google-site-verification', content: '25aGtsdrxiV5R2Q8Uc-e3j7KJjSH2EmjkdZ_JsOTYiU'}
    ],
    link: [
      {rel: 'icon', type: 'image/x-icon', href: '/favicon.ico'}
    ]
  },
  manifest: {  // PWA meta
    name: 'Your project name',
    short_name: 'Short name'
  },
  router: {
    middleware: 'router-auth'
  },
  loading: { // Customize the progress bar color
    color: '#01579B'
  },
  modules: [
    '@nuxtjs/pwa',
    'nuxt-sass-resources-loader'
  ],
  sassResources: [
    '@/assets/styles/global.scss'
  ],
  plugins: [
    '@/plugins/element-ui',
    '@/plugins/fireauth.js',
    '@/plugins/filters.js',
  ],
  css: [
    {src: 'element-ui/lib/theme-chalk/index.css'},
    {src: '@/assets/styles/element-variables.scss', lang: 'sass'},
  ],
  /*
   ** Build configuration
   */
  buildDir: '../prod/server/nuxt',
  build: {
    vendor: ['element-ui', 'firebase'],
    publicPath: '/assets/',
    extractCSS: true,
    babel: {
      presets: ['es2015', 'stage-0'],
      plugins: [
        ["transform-runtime", {
          "polyfill": true,
          "regenerator": true
        }],
      ]
    },
    /*
     ** Run ESLint on save
     */
    extend(config, ctx) {
      if (ctx.dev && ctx.isClient) {
        // config.module.rules.push({
        //   enforce: 'pre',
        //   test: /\.(js|vue)$/,
        //   loader: 'eslint-loader',
        //   exclude: /(node_modules)/
        // })
      }
    }
  }
}
