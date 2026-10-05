<template>
  <a-list class="lb-list" :data-source="items" :split="false">
    <template #renderItem="{ item, index }">
      <a-list-item class="lb-row">
      <div class="lb-left">
        <a-avatar v-if="showAvatar" :size="40" class="lb-avatar">
          {{ item.name.charAt(0) }}
        </a-avatar>
        <div class="lb-info">
          <div class="lb-name">{{ item.name }}</div>
          <div class="lb-sub">{{ item.sub }}</div>
        </div>
      </div>
      <div class="lb-right">
        <span class="lb-rank">{{ index + 1 }}</span>
        <caret-up-outlined v-if="item.trend === 'up'" class="trend-up" />
        <caret-down-outlined v-else class="trend-dn" />
      </div>
      </a-list-item>
    </template>
  </a-list>
</template>

<script lang="ts">
import { defineComponent, PropType } from 'vue'
import { Avatar, List } from 'ant-design-vue'
import { CaretUpOutlined, CaretDownOutlined } from '@ant-design/icons-vue'

export interface LeaderboardItem {
  name: string
  sub: string
  trend: 'up' | 'down'
}

export default defineComponent({
  name: 'LeaderboardList',

  components: {
    AAvatar: Avatar,
    AList: List,
    AListItem: List.Item,
    CaretUpOutlined,
    CaretDownOutlined
  },

  props: {
    items: {
      type: Array as PropType<LeaderboardItem[]>,
      required: true
    },
    showAvatar: {
      type: Boolean,
      default: false
    }
  }
})
</script>

<style scoped>
.lb-list {
  min-width: 0;
}

.lb-list :deep(.ant-list-items) {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.lb-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0;
  border: 0;
}

.lb-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.lb-avatar {
  background: #DBEAFE;
  color: #2563EB;
  font-weight: 700;
  font-size: 15px;
  flex-shrink: 0;
}

.lb-info {
  min-width: 0;
}

.lb-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lb-sub {
  font-size: 12px;
  color: #9CA3AF;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.lb-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin-left: 16px;
}

.lb-rank {
  font-size: 14px;
  font-weight: 700;
  color: #374151;
}

.trend-up {
  font-size: 14px;
  color: #22C55E;
}

.trend-dn {
  font-size: 14px;
  color: #EF4444;
}
</style>
