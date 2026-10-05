<template>
  <a-result v-if="!hasPermission('dashboard:view')" status="403" title="暂无仪表盘查看权限" />
  <div v-else class="rp-page">
    <!-- 概览 -->
    <div class="rp-overview">

      <!-- 左侧指标 -->
      <div class="metrics-grid">

        <!-- 活跃用户 -->
        <a-card class="m-card">
          <a-statistic class="metric-stat" title="活跃用户" :value="27">
            <template #suffix><span class="m-dim">/80</span></template>
          </a-statistic>
        </a-card>

        <!-- 已回答问题 -->
        <a-card class="m-card">
          <a-statistic class="metric-stat" title="已回答问题" :value="3298" />
        </a-card>

        <!-- 平均会话时长 -->
        <a-card class="m-card">
          <a-statistic class="metric-stat" title="平均会话时长" value="2分34秒" />
        </a-card>

        <!-- 初始知识掌握度 -->
        <a-card class="m-card m-spark-card">
          <a-statistic class="metric-stat" title="初始知识掌握度" value="64%" />

          <svg
              class="sparkline"
              viewBox="0 0 160 38"
              preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                  id="g-sk"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
              >
                <stop
                    offset="0%"
                    stop-color="#3B82F6"
                    stop-opacity="0.18"
                />

                <stop
                    offset="100%"
                    stop-color="#3B82F6"
                    stop-opacity="0"
                />
              </linearGradient>
            </defs>

            <path
                d="M0,26 C18,26 28,18 45,20 C62,22 72,12 90,16 C108,20 120,10 160,12"
                fill="none"
                stroke="#3B82F6"
                stroke-width="2"
                stroke-linecap="round"
            />

            <path
                d="M0,26 C18,26 28,18 45,20 C62,22 72,12 90,16 C108,20 120,10 160,12 L160,38 L0,38 Z"
                fill="url(#g-sk)"
            />
          </svg>
        </a-card>

        <!-- 当前知识掌握度 -->
        <a-card class="m-card m-spark-card">
          <a-statistic class="metric-stat" title="当前知识掌握度" value="86%" />

          <svg
              class="sparkline"
              viewBox="0 0 160 38"
              preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                  id="g-ck"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
              >
                <stop
                    offset="0%"
                    stop-color="#3B82F6"
                    stop-opacity="0.18"
                />

                <stop
                    offset="100%"
                    stop-color="#3B82F6"
                    stop-opacity="0"
                />
              </linearGradient>
            </defs>

            <path
                d="M0,22 C22,22 30,14 50,10 C70,6 80,16 100,10 C120,4 135,8 160,6"
                fill="none"
                stroke="#3B82F6"
                stroke-width="2"
                stroke-linecap="round"
            />

            <path
                d="M0,22 C22,22 30,14 50,10 C70,6 80,16 100,10 C120,4 135,8 160,6 L160,38 L0,38 Z"
                fill="url(#g-ck)"
            />
          </svg>
        </a-card>

        <!-- 知识提升 -->
        <a-card class="m-card m-spark-card">
          <a-statistic class="metric-stat" title="知识提升" value="+34%" />

          <svg
              class="sparkline"
              viewBox="0 0 160 38"
              preserveAspectRatio="none"
          >
            <defs>
              <linearGradient
                  id="g-kg"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
              >
                <stop
                    offset="0%"
                    stop-color="#3B82F6"
                    stop-opacity="0.18"
                />

                <stop
                    offset="100%"
                    stop-color="#3B82F6"
                    stop-opacity="0"
                />
              </linearGradient>
            </defs>

            <path
                d="M0,30 C16,28 28,22 46,18 C64,14 76,20 96,14 C116,8 132,10 160,5"
                fill="none"
                stroke="#3B82F6"
                stroke-width="2"
                stroke-linecap="round"
            />

            <path
                d="M0,30 C16,28 28,22 46,18 C64,14 76,20 96,14 C116,8 132,10 160,5 L160,38 L0,38 Z"
                fill="url(#g-kg)"
            />
          </svg>
        </a-card>

      </div>

      <!-- 活跃趋势 -->
      <a-card class="activity-card">

        <div class="act-head">
          <span class="act-title">
            活跃趋势
          </span>

          <a-select
              v-model:value="actPeriod"
              size="small"
              :options="periodOpts"
              class="period-sel"
          />
        </div>

        <div
            ref="chartWrap"
            class="chart-wrap"
        >
          <svg
              :viewBox="`0 0 ${cW} ${cH}`"
              width="100%"
              :height="cH"
          >

            <!-- Y 轴 -->
            <g
                v-for="t in yTicks"
                :key="t.v"
            >
              <line
                  :x1="cL"
                  :y1="t.y"
                  :x2="cW - cR"
                  :y2="t.y"
                  stroke="#F3F4F6"
                  stroke-width="1"
              />

              <text
                  :x="cL - 5"
                  :y="t.y + 4"
                  text-anchor="end"
                  font-size="10"
                  fill="#D1D5DB"
              >
                {{ t.v }}
              </text>
            </g>

            <!-- 柱子 -->
            <g
                v-for="(b, i) in bars"
                :key="i"
            >
              <rect
                  class="activity-bar"
                  :class="{
                  'activity-bar-active':
                    chartTooltip.visible &&
                    chartTooltip.index === i
                }"
                  :x="b.x"
                  :y="b.y"
                  :width="b.w"
                  :height="b.h"
                  rx="3"
                  :fill="b.hi ? '#3B82F6' : '#BFDBFE'"
                  @mouseenter="showBarTooltip(i, $event)"
                  @mousemove="moveBarTooltip($event)"
                  @mouseleave="hideBarTooltip"
              />

              <text
                  :x="b.cx"
                  :y="cH - cB + 13"
                  text-anchor="middle"
                  font-size="9"
                  fill="#D1D5DB"
                  pointer-events="none"
              >
                {{ months[i] }}
              </text>
            </g>

          </svg>

          <!-- Tooltip -->
          <div
              v-if="chartTooltip.visible"
              class="chart-tooltip"
              :style="{
              left: chartTooltip.x + 'px',
              top: chartTooltip.y + 'px'
            }"
          >
            <div class="tooltip-month">
              {{ chartTooltip.month }}
            </div>

            <div class="tooltip-value">
              {{ chartTooltip.value }} 次
            </div>
          </div>

        </div>

      </a-card>

    </div>

    <!-- 主题分析 -->
    <div class="rp-two-col">

      <!-- 薄弱主题 -->
      <a-card class="rp-card">
        <h3 class="rp-card-title">
          薄弱主题
        </h3>

        <topic-list
            :topics="weakTopics"
            :stroke-color="weakColor"
        />
      </a-card>

      <!-- 优势主题 -->
      <a-card class="rp-card">
        <h3 class="rp-card-title">
          优势主题
        </h3>

        <topic-list
            :topics="strongTopics"
            stroke-color="#22C55E"
        />
      </a-card>

    </div>

    <!-- 排行榜 -->
    <div class="rp-two-col">

      <!-- 用户排行榜 -->
      <a-card class="rp-card">
        <h3 class="rp-card-title">
          用户排行榜
        </h3>

        <leaderboard-list
            :items="userLb"
            :show-avatar="true"
        />
      </a-card>

      <!-- 分组排行榜 -->
      <a-card class="rp-card">
        <h3 class="rp-card-title">
          分组排行榜
        </h3>

        <leaderboard-list
            :items="groupLb"
            :show-avatar="false"
        />
      </a-card>

    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { Card, Result, Select, Statistic } from 'ant-design-vue'
import { hasPermission } from '@/utils/access'

import TopicList, {
  TopicItem
} from './components/TopicList.vue'

import LeaderboardList, {
  LeaderboardItem
} from './components/LeaderboardList.vue'

const BAR_DATA = [
  80,
  145,
  185,
  160,
  225,
  195,
  255,
  175,
  130,
  305,
  340,
  400
]

const Y_MAX = 400

const MONTHS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月'
]

const CW = 500
const CH = 200
const CT = 12
const CB = 22
const CL = 34
const CR = 8

export default defineComponent({
  name: 'ReportsPage',

  components: {
    AResult: Result,
    ACard: Card,
    ASelect: Select,
    AStatistic: Statistic,
    TopicList,
    LeaderboardList
  },

  data() {
    return {
      months: MONTHS,

      cW: CW,
      cH: CH,
      cT: CT,
      cB: CB,
      cL: CL,
      cR: CR,

      actPeriod: 'month',

      chartTooltip: {
        visible: false,
        index: -1,
        x: 0,
        y: 0,
        month: '',
        value: 0
      },

      periodOpts: [
        {
          value: 'month',
          label: '月'
        },
        {
          value: 'week',
          label: '周'
        },
        {
          value: 'day',
          label: '日'
        }
      ],

      weakColor: {
        '0%': '#F97316',
        '100%': '#EF4444'
      },

      weakTopics: [
        {
          name: '食品安全',
          percent: 74,
          color: '#F97316'
        },
        {
          name: '基础合规流程',
          percent: 52,
          color: '#FB923C'
        },
        {
          name: '公司网络规范',
          percent: 36,
          color: '#EF4444'
        }
      ] as TopicItem[],

      strongTopics: [
        {
          name: '疫情防控规范',
          percent: 95,
          color: '#16A34A'
        },
        {
          name: '网络安全基础',
          percent: 92,
          color: '#2563EB'
        },
        {
          name: '社交媒体规范',
          percent: 89,
          color: '#7C3AED'
        }
      ] as TopicItem[],

      userLb: [
        {
          name: 'Jesse Thomas',
          sub: '637 积分 · 正确率 98%',
          trend: 'up'
        },
        {
          name: 'Thisal Mathiyazhagan',
          sub: '637 积分 · 正确率 89%',
          trend: 'down'
        },
        {
          name: 'Sarah Mitchell',
          sub: '620 积分 · 正确率 91%',
          trend: 'up'
        }
      ] as LeaderboardItem[],

      groupLb: [
        {
          name: '休斯顿设施组',
          sub: '人均 52 积分 · 正确率 97%',
          trend: 'up'
        },
        {
          name: '测试组',
          sub: '人均 52 积分 · 正确率 95%',
          trend: 'down'
        },
        {
          name: '远程团队',
          sub: '人均 48 积分 · 正确率 90%',
          trend: 'up'
        }
      ] as LeaderboardItem[]
    }
  },

  computed: {
    /**
     * Y 轴刻度
     */
    yTicks(): Array<{
      v: number
      y: number
    }> {
      const drawH =
          CH - CT - CB

      return [
        0,
        100,
        200,
        300,
        400
      ].map(v => ({
        v,
        y:
            CT +
            drawH *
            (1 - v / Y_MAX)
      }))
    },

    /**
     * 活跃趋势柱状图
     */
    bars(): Array<{
      x: number
      y: number
      w: number
      h: number
      cx: number
      hi: boolean
    }> {
      const drawW =
          CW - CL - CR

      const drawH =
          CH - CT - CB

      const slotW =
          drawW / BAR_DATA.length

      const bw =
          slotW * 0.45

      return BAR_DATA.map(
          (v, i) => {
            const bh =
                (v / Y_MAX) *
                drawH

            const x =
                CL +
                i * slotW +
                (slotW - bw) / 2

            return {
              x,

              y:
                  CT +
                  drawH -
                  bh,

              w: bw,

              h: bh,

              cx:
                  x +
                  bw / 2,

              hi:
                  v >= 280
            }
          }
      )
    }
  },

  methods: {
    hasPermission,
    /**
     * 鼠标进入柱状图
     */
    showBarTooltip(
        index: number,
        event: MouseEvent
    ) {
      this.chartTooltip.visible = true
      this.chartTooltip.index = index
      this.chartTooltip.month = MONTHS[index]
      this.chartTooltip.value = BAR_DATA[index]

      this.updateTooltipPosition(event)
    },

    /**
     * 鼠标移动
     */
    moveBarTooltip(
        event: MouseEvent
    ) {
      if (
          !this.chartTooltip.visible
      ) {
        return
      }

      this.updateTooltipPosition(event)
    },

    /**
     * 鼠标离开
     */
    hideBarTooltip() {
      this.chartTooltip.visible = false
      this.chartTooltip.index = -1
    },

    /**
     * Tooltip 位置
     */
    updateTooltipPosition(
        event: MouseEvent
    ) {
      const chartWrap =
          this.$refs.chartWrap as HTMLElement

      if (!chartWrap) {
        return
      }

      const rect =
          chartWrap.getBoundingClientRect()

      const tooltipWidth = 82
      const tooltipHeight = 52

      let x =
          event.clientX -
          rect.left +
          12

      let y =
          event.clientY -
          rect.top -
          tooltipHeight -
          8

      /*
       * 防止超出右侧
       */
      if (
          x +
          tooltipWidth >
          rect.width
      ) {
        x =
            event.clientX -
            rect.left -
            tooltipWidth -
            12
      }

      /*
       * 防止超出顶部
       */
      if (y < 0) {
        y =
            event.clientY -
            rect.top +
            14
      }

      this.chartTooltip.x = x
      this.chartTooltip.y = y
    }
  }
})
</script>

<style scoped>
/* ================================
   页面
   ================================ */

.rp-page {
  padding: 28px 28px 40px;

  display: flex;
  flex-direction: column;

  gap: 16px;

  background: transparent;
}

/* ================================
   顶部概览
   ================================ */

.rp-overview {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 18px;

  align-items: stretch;
}

/* ================================
   左侧指标
   ================================ */

.metrics-grid {
  min-width: 0;

  display: grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  grid-template-rows:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.m-card {
  min-width: 0;
  border-color: #e5e7eb;
  border-radius: 14px;
}

.m-card :deep(.ant-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 14px;
}

.m-spark-card {
  min-height: 108px;
}

.metric-stat :deep(.ant-statistic-title) {
  margin-bottom: 8px;
  color: #9ca3af;
  font-size: 12px;
  line-height: 1.3;
}

.metric-stat :deep(.ant-statistic-content) {
  color: #111827;
  font-size: 26px;
  font-weight: 700;
  line-height: 1;
  font-variant-numeric:
      tabular-nums;
}

.m-dim {
  color: #d1d5db;
  font-size: 15px;
}

.sparkline {
  display: block;

  width: 100%;
  height: 38px;

  margin-top: auto;

  padding-top: 8px;
}

/* ================================
   活跃趋势
   ================================ */

.activity-card {
  min-width: 0;
  border-color: #e5e7eb;
  border-radius: 14px;
}

.activity-card :deep(.ant-card-body) {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 16px 16px 12px;
}

.act-head {
  display: flex;

  align-items: center;

  justify-content: space-between;

  margin-bottom: 10px;
}

.act-title {
  color: #374151;

  font-size: 14px;

  font-weight: 600;
}

.period-sel {
  width: 88px;
}

:deep(
  .period-sel
  .ant-select-selector
) {
  border-radius:
      6px !important;

  font-size: 12px;

  font-weight: 600;
}

/* ================================
   Chart
   ================================ */

.chart-wrap {
  position: relative;

  flex: 1;

  min-width: 0;

  display: flex;

  align-items: center;
}

.chart-wrap svg {
  display: block;

  width: 100%;
}

.activity-bar {
  cursor: pointer;

  transition:
      opacity 0.15s ease,
      filter 0.15s ease;
}

.activity-bar:hover,
.activity-bar-active {
  opacity: 0.82;

  filter:
      saturate(1.15)
      brightness(0.96);
}

/* ================================
   Tooltip
   ================================ */

.chart-tooltip {
  position: absolute;

  z-index: 20;

  min-width: 74px;

  padding:
      8px 10px;

  box-sizing:
      border-box;

  pointer-events:
      none;

  background:
      #111827;

  border-radius:
      7px;

  box-shadow:
      0 6px 18px
      rgba(
          15,
          23,
          42,
          0.18
      );
}

.tooltip-month {
  margin-bottom:
      3px;

  color:
      #9ca3af;

  font-size:
      11px;

  font-weight:
      500;

  line-height:
      14px;
}

.tooltip-value {
  color:
      #ffffff;

  font-size:
      14px;

  font-weight:
      700;

  line-height:
      18px;

  white-space:
      nowrap;

  font-variant-numeric:
      tabular-nums;
}

/* ================================
   Topics / Leaderboard
   ================================ */

.rp-two-col {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 18px;
}

.rp-card {
  min-width: 0;
  border-color: #e5e7eb;
  border-radius: 14px;
}

.rp-card :deep(.ant-card-body) {
  padding: 20px;
}

.rp-card-title {
  margin:
      0 0 18px;

  color:
      #9ca3af;

  font-size:
      13px;

  font-weight:
      600;
}

/* ================================
   卡片 Hover
   ================================ */

.m-card,
.activity-card,
.rp-card {
  transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      border-color 0.2s ease;
}

@media (hover: hover) and (pointer: fine) {
  .m-card:hover,
  .activity-card:hover,
  .rp-card:hover {
    transform:
        translateY(-4px);

    border-color:
        transparent;

    box-shadow:
        0 10px 26px
        rgba(
            15,
            23,
            42,
            0.09
        );
  }
}

/* ================================
   响应式
   ================================ */

@media (max-width: 1100px) {
  .rp-overview {
    grid-template-columns:
      1fr;
  }
}

@media (max-width: 860px) {
  .metrics-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }

  .rp-two-col {
    grid-template-columns:
      1fr;
  }
}

@media (max-width: 560px) {
  .rp-page {
    padding:
        20px
        16px
        28px;
  }

  .metrics-grid {
    grid-template-columns:
      1fr;
  }
}

/* ================================
   减少动画
   ================================ */

@media (
prefers-reduced-motion:
    reduce
) {
  .m-card,
  .activity-card,
  .rp-card,
  .activity-bar {
    transition: none;
  }

  .m-card:hover,
  .activity-card:hover,
  .rp-card:hover {
    transform: none;
  }
}
</style>
