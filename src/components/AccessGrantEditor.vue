<template>
  <a-typography class="grant-editor">
    <div class="grant-title"><h3>操作权限</h3><a-typography-text type="secondary">按功能模块设置可执行的操作。</a-typography-text></div>
    <div class="grant-tools"><a-space :size="8"><a-tag>{{ permissionCodes.length }} 项操作</a-tag></a-space><a-button type="link" size="small" @click="toggleAll">{{ openModules.length === modules.length ? '收起全部' : '展开全部' }}</a-button></div>
    <a-collapse :active-key="openModules" class="module-groups" @change="changeOpenModules">
      <a-collapse-panel v-for="module in modules" :key="module.key" :force-render="true">
        <template #header><div class="module-heading"><strong>{{ module.label }}</strong><a-typography-text type="secondary">{{ module.operations.filter(item => permissionCodes.includes(item.code)).length }} / {{ module.operations.length }} 项操作</a-typography-text></div></template>
        <div class="module-operations"><div v-for="permission in module.operations" :key="permission.code" class="permission-option"><a-checkbox :checked="permissionCodes.includes(permission.code)" :disabled="disabled || !allowManagement && permission.code === 'access:manage'" @change="$emit('toggle-permission', permission.code)">{{ permission.label }}</a-checkbox><a-typography-text v-if="inheritedPermissions.includes(permission.code)" type="secondary" class="grant-origin">继承</a-typography-text></div></div>
        <a-typography-text v-if="module.key === 'access' && !allowManagement" type="secondary" class="fixed-grant-note">普通用户不能获得权限管理能力。</a-typography-text>
      </a-collapse-panel>
    </a-collapse>
  </a-typography>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Button, Checkbox, Collapse, Space, Tag, Typography } from 'ant-design-vue'
import { PERMISSION_MODULES, ACCESS_PERMISSIONS } from '@/constants/access'
import type { PermissionModule, Permission } from '@/types/workspace'
export default defineComponent({
  name: 'AccessGrantEditor',
  components: { AButton: Button, ACheckbox: Checkbox, ACollapse: Collapse, ACollapsePanel: Collapse.Panel, ASpace: Space, ATag: Tag, ATypography: Typography, ATypographyText: Typography.Text },
  props: { permissionCodes: { type: Array as PropType<string[]>, required: true }, inheritedPermissions: { type: Array as PropType<string[]>, default: () => [] }, disabled: Boolean, allowManagement: Boolean },
  emits: ['toggle-permission'],
  data() { return { openModules: ['email'], permissionModules: PERMISSION_MODULES, permissions: ACCESS_PERMISSIONS } },
  computed: { modules(): Array<PermissionModule & { operations: Permission[] }> { return this.permissionModules.map(menu => ({ ...menu, operations: this.permissions.filter(permission => permission.code.startsWith(menu.key + ':')) })) } },
  methods: {
    changeOpenModules(keys: string | number | Array<string | number>) { this.openModules = (Array.isArray(keys) ? keys : [keys]).map(String) },
    toggleAll() { this.openModules = this.openModules.length === this.modules.length ? [] : this.modules.map(module => module.key) }
  }
})
</script>
<style scoped>
.grant-editor { margin: 0; }
.grant-title { margin-bottom: 18px; }
.grant-title h3 { margin: 0 0 6px; color: inherit; font-size: 15px; font-weight: 600; }
.grant-title > :last-child { font-size: 12px; }
.grant-tools { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 0 0 12px; font-size: 13px; }
.module-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.module-heading strong { font-weight: 600; }
.module-heading > :last-child { font-size: 12px; white-space: nowrap; }
.module-groups { overflow: hidden; border-radius: 10px; }
.module-groups :deep(.ant-collapse-header) { padding: 16px; align-items: center; }
.module-groups :deep(.ant-collapse-content-box) { padding: 20px; }
.module-operations { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 20px; }
.permission-option { display: flex; align-items: flex-start; flex-wrap: wrap; gap: 4px; }
.grant-origin { font-size: 12px; }
.fixed-grant-note { display: block; margin-top: 16px; font-size: 12px; }
@media (max-width: 600px) { .module-operations { grid-template-columns: minmax(0, 1fr); } }
</style>
