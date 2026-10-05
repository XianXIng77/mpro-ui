<template>
  <a-list class="topic-list" :data-source="topics" :split="false">
    <template #renderItem="{ item }">
      <a-list-item class="topic-row">
      <!-- 缩略图 -->
      <a-avatar
          class="thumb"
          :size="46"
          shape="square"
          :style="{ background: item.color }"
      >
        {{ item.name.charAt(0) }}
      </a-avatar>

      <!-- 右侧内容 -->
      <div class="topic-body">
        <div class="topic-name">
          {{ item.name }}
        </div>

        <div class="progress-row">
          <!-- Ant Design Vue 进度条 -->
          <a-progress
              class="topic-progress"
              :percent="item.percent"
              :show-info="false"
              :stroke-color="strokeColor"
              :trail-color="'#F3F4F6'"
              :stroke-width="8"
          />

          <!-- 百分比 -->
          <div class="progress-text">
            <strong>{{ item.percent }}%</strong>
            <span>Correct</span>
          </div>
        </div>
      </div>
      </a-list-item>
    </template>
  </a-list>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType
} from 'vue'

import {
  Avatar,
  List,
  Progress
} from 'ant-design-vue'

export interface TopicItem {
  name: string
  percent: number
  color: string
}

type ProgressColor =
    | string
    | Record<string, string>

export default defineComponent({
  name: 'TopicList',

  components: {
    AAvatar: Avatar,
    AList: List,
    AListItem: List.Item,
    AProgress: Progress
  },

  props: {
    topics: {
      type: Array as PropType<TopicItem[]>,
      required: true
    },

    strokeColor: {
      type: [String, Object] as PropType<ProgressColor>,
      default: '#22C55E'
    }
  }
})
</script>

<style scoped>
.topic-list {
  min-width: 0;
}

.topic-list :deep(.ant-list-items) {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.topic-row {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
  padding: 0;
  border: 0;
}

/* ================================
   缩略图
   ================================ */

.thumb {
  flex-shrink: 0;
  border-radius: 10px;

  color: #fff;
  font-size: 17px;
  font-weight: 700;
  line-height: 1;
}

/* ================================
   内容区域
   ================================ */

.topic-body {
  flex: 1;
  min-width: 0;

  display: flex;
  flex-direction: column;
  gap: 7px;
}

.topic-name {
  overflow: hidden;

  color: #111827;

  font-size: 13px;
  font-weight: 600;
  line-height: 18px;

  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ================================
   进度区域
   ================================ */

.progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.topic-progress {
  flex: 1;
  min-width: 0;
  margin: 0;
  line-height: 1;
}

/*
 * 去掉 Progress 默认产生的额外间距
 */
:deep(.topic-progress .ant-progress-outer) {
  display: block;
  width: 100%;
  margin: 0;
  padding: 0;
}

:deep(.topic-progress .ant-progress-inner) {
  display: block;
  background: #f3f4f6;
}

/* ================================
   百分比
   ================================ */

.progress-text {
  flex-shrink: 0;

  display: flex;
  align-items: center;
  gap: 4px;

  min-width: 86px;

  color: #374151;

  font-size: 12px;
  line-height: 16px;

  white-space: nowrap;
}

.progress-text strong {
  color: #374151;
  font-weight: 700;
}

.progress-text span {
  color: #9ca3af;
  font-weight: 400;
}
</style>
