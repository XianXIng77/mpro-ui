<template>
  <workspace-page>
    <a-card class="workspace-card account-card" :body-style="{ padding: 0 }">
      <account-management-panel />
    </a-card>
  </workspace-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Card } from 'ant-design-vue'
import WorkspacePage from '@/components/WorkspacePage.vue'
import AccountManagementPanel from './AccountManagementPanel.vue'

export default defineComponent({
  name: 'AccountManagementPage',
  components: { WorkspacePage, AccountManagementPanel, ACard: Card }
})
</script>
