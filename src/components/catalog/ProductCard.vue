<template>
  <div
    v-if="product"
    @click="viewProduct"
    class="card_wrapper"
    @touchstart="hoveredCard = true" @touchend="hoveredCard = false"
    @mouseover="hoveredCard = true" @mouseleave="hoveredCard = false"
    itemscope itemtype="http://schema.org/Product">
    <div :body-style="{ padding: '0px' }" id="card">
      <el-row id="card_content">
        <el-col id="product_img_wrap">
          <div id="product_image">
            <img v-if="product.img_0 && product.img_0.card"
                 :src="product.img_0.card"
                 :alt="product.title"
                 onerror="this.onerror=null;this.src='/catalog/no_photo.svg';">
            <img v-else src="/catalog/no_photo.svg" :alt="product.title">
          </div>
        </el-col>
        <el-col id="product_description"
                :xs="18" :sm="16" :md="16" :lg="15" :xl="18">
          <p id="title" itemprop="name">{{ product.title }}</p>
          <p id="sku">Арт.: <span itemprop="sku">{{ product.SKU }}</span></p>
        </el-col>
        <el-col id="price_wrap">
          <p id="price" itemprop="offers" itemscope itemtype="http://schema.org/Offer">
            <span itemprop="price" :content="product.price">{{ product.price }} </span>
            <span itemprop="priceCurrency" content="RUB">RUB</span>
          </p>
        </el-col>
      </el-row>
    </div>
  </div>
</template>
<script>
  export default {
    name: 'product-card',
    props: {id: {type: String, required: true}},
    data() {
      return {
        hoveredCard: false
      }
    },
    methods: {
      updateOwnProduct(product, subject, operation) {
        if (operation === 'add') {
          this.$store.dispatch('increaseProductCounter', {id: this.id, type: 'cart'})
        }
        this.$store.dispatch('USER_EVENT', `${subject === 'cart' ? 'Корзина' : 'Избранное'}: ${operation === 'add' ? ' добавлен' : ' удален'} "${product.title}"`)
        this.$store.dispatch('updateOwnProducts', {
          subject: subject,
          operation: operation,
          product: product
        })
      },
      viewProduct() {
        this.$router.push({
          path: `/catalog/${this.product.group}/${this.product.category}/${this.id}`,
        })
      }
    },
    computed: {
      user() {
        return this.$store.getters.user
      },
      product() {
        return this.$store.getters.products[this.id]
      }
    }
  }
</script>

<style scoped lang="scss">
  .card_wrapper {
    transition: all .5s;
  }

  .card_wrapper:hover,
  .card_wrapper:active {
    cursor: pointer;
    transform: scale(1.01);
  }

  #card {
    margin-left: 10px;
    margin-right: 10px;
    margin-bottom: 8px;
    padding: 5px;
    border: 1px solid $color-info-light;
    border-radius: 3px;
    transition: all .5s;
    height: 120px;
    &:hover, &:active {
      @include thirdShadow
    }
    #card_content {
      display: flex;
      justify-content: start;
      #product_img_wrap {
        width: 160px;
        #product_image {
          width: 120px;
          height: 120px;
          padding-left: 10px;
          img {
            width: 120px;
            height: 100%;
            object-fit: cover;
          }
        }
      }

      #product_description {
        padding: 10px;
        #title {
          font-size: 16px;
          color: $color-primary;
        }
        #sku {
          color: $color-info;
          font-size: 13px;
        }
      }
      #price_wrap {
        width: 110px;
        #price {
          margin-top: 54px;
          color: $color-success-second;
          font-size: 14px;
        }
      }
    }
  }

  @media only screen and (max-width: $xs-screen) {
    #card {
      height: 180px;
    }
    #product_img_wrap {
      width: 100px !important;
      #product_image {
        padding-top: 30px;
        width: 80px !important;
        height: 80px !important;
        img {
          width: 80px !important;
        }
      }
    }
    #price_wrap {
      width: 80px !important;
    }
  }
</style>
