<template>
  <svg
    :viewBox="compact ? '0 0 36 32' : '0 0 180 32'"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Mercurypro"
    fill="currentColor"
  >
    <path d="M2 6 H34 L30 10 H20 V26 H15 V10 H6 Z" />
    <g v-if="!compact">
      <path d="M43 6 H70 L66 10 H43 Z" />
      <path d="M43 14 H65 L61 18 H43 Z" />
      <path d="M43 22 H70 L66 26 H43 Z" />
      <path
        d="M82 6 H111 L107 10 H87 L84 13 L87 15 H106
           C110 15 112 17 112 20 C112 24 109 26 105 26
           H78 L82 22 H103 L106 20 L103 18 H84
           C80 18 78 16 78 13 C78 10 79 8 82 6 Z"
      />
      <path d="M121 6 H126 V22 H148 L144 26 H121 Z" />
      <path d="M154 6 H178 L175.5 10 H156.5 Z" />
      <rect x="154" y="14" width="24" height="4" />
      <rect x="154" y="18" width="4" height="8" />
      <rect x="174" y="18" width="4" height="8" />
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'SystemLogo',
  props: {
    compact: {
      type: Boolean,
      default: false
    }
  }
})
</script>