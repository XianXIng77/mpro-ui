<template>
  <section class="developing-page">
    <p>页面开发中</p>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DevelopingPage'
})
</script>

<style scoped>
.developing-page {
  padding: 28px;
}

p {
  margin: 0;
  color: #64748b;
  font-size: 14px;
  line-height: 1.6;
}
</style>
