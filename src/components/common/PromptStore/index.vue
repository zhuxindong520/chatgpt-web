<script setup lang='ts'>
import type { DataTableColumns } from 'naive-ui'
import { computed, h, ref, watch } from 'vue'
import { NButton, NCard, NDataTable, NDivider, NGi, NGrid, NInput, NLayoutContent, NMessageProvider, NModal, NPopconfirm, NSpace, NTabPane, NTabs, useMessage } from 'naive-ui'
import PromptRecommend from '../../../assets/recommend.json'
import { SvgIcon } from '..'
import { usePromptStore } from '@/store'
import { useBasicLayout } from '@/hooks/useBasicLayout'

interface DataProps {
  renderKey: string
  renderValue: string
  key: string
  value: string
}

interface Props {
  visible: boolean
}

interface Emit {
  (e: 'update:visible', visible: boolean): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emit>()

const message = useMessage()

const show = computed({
  get: () => props.visible,
  set: (visible: boolean) => emit('update:visible', visible),
})

const showModal = ref(false)

// 移动端自适应相关
const { isMobile } = useBasicLayout()

const promptStore = usePromptStore()

// Prompt在线导入推荐List,根据部署者喜好进行修改(assets/recommend.json)
const promptRecommendList = PromptRecommend
const promptList = ref<any>(promptStore.promptList)

// 用于添加修改的临时prompt参数
const tempPromptKey = ref('')
const tempPromptValue = ref('')

// Modal模式，根据不同模式渲染不同的Modal内容
const modalMode = ref('')

// 这个是为了后期的修改Prompt内容考虑，因为要针对无uuid的list进行修改，且考虑到不能出现标题和内容的冲突，所以就需要一个临时item来记录一下
const tempModifiedItem = ref<any>({})

// 添加修改导入都使用一个Modal, 临时修改内容占用tempPromptKey,切换状态前先将内容都清楚
const changeShowModal = (mode: string, selected = { key: '', value: '' }) => {
  if (mode === 'add') {
    tempPromptKey.value = ''
    tempPromptValue.value = ''
  }
  else if (mode === 'modify') {
    tempModifiedItem.value = { ...selected }
    tempPromptKey.value = selected.key
    tempPromptValue.value = selected.value
  }
  else if (mode === 'local_import') {
    tempPromptKey.value = 'local_import'
    tempPromptValue.value = ''
  }
  showModal.value = !showModal.value
  modalMode.value = mode
}

// 在线导入相关
const downloadURL = ref('')
const downloadDisabled = computed(() => downloadURL.value.trim().length < 1)
const setDownloadURL = (url: string) => {
  downloadURL.value = url
}

// 控制 input 按钮
const inputStatus = computed (() => tempPromptKey.value.trim().length < 1 || tempPromptValue.value.trim().length < 1)

// Prompt模板相关操作
const addPromptTemplate = () => {
  for (const i of promptList.value) {
    if (i.key === tempPromptKey.value) {
      message.error('已存在重复标题,请重新输入')
      return
    }
    if (i.value === tempPromptValue.value) {
      message.error(`已存在重复内容:${tempPromptKey.value},请重新输入`)
      return
    }
  }
  promptList.value.unshift({ key: tempPromptKey.value, value: tempPromptValue.value } as never)
  message.success('添加prompt成功')
  changeShowModal('')
}

const modifyPromptTemplate = () => {
  let index = 0

  // 通过临时索引把待修改项摘出来
  for (const i of promptList.value) {
    if (i.key === tempModifiedItem.value.key && i.value === tempModifiedItem.value.value)
      break
    index = index + 1
  }

  const tempList = promptList.value.filter((_: any, i: number) => i !== index)

  // 搜索有冲突的部分
  for (const i of tempList) {
    if (i.key === tempPromptKey.value) {
      message.error('检测修改Prompt标题冲突，请重新修改')
      return
    }
    if (i.value === tempPromptValue.value) {
      message.error(`检测修改内容${i.key}冲突，请重新修改`)
      return
    }
  }

  promptList.value = [{ key: tempPromptKey.value, value: tempPromptValue.value }, ...tempList] as never
  message.success('Prompt 信息修改成功')
  changeShowModal('')
}

const deletePromptTemplate = (row: { key: string; value: string }) => {
  promptList.value = [
    ...promptList.value.filter((item: { key: string; value: string }) => item.key !== row.key),
  ] as never
  message.success('删除 Prompt 成功')
}

const clearPromptTemplate = () => {
  promptList.value = []
  message.success('清空 Prompt 成功')
}

const importPromptTemplate = () => {
  try {
    const jsonData = JSON.parse(tempPromptValue.value)
    for (const i of jsonData) {
      let safe = true
      for (const j of promptList.value) {
        if (j.key === i.key) {
          message.warning(`因标题重复跳过：${i.key}`)
          safe = false
          break
        }
        if (j.value === i.value) {
          message.warning(`因内容重复跳过：${i.key}`)
          safe = false
          break
        }
      }
      if (safe)
        promptList.value.unshift({ key: i.key, value: i.value } as never)
    }
    message.success('导入成功')
    changeShowModal('')
  }
  catch {
    message.error('JSON 格式错误，请检查 JSON 格式')
    changeShowModal('')
  }
}

// 模板导出
const exportPromptTemplate = () => {
  const jsonDataStr = JSON.stringify(promptList.value)
  const blob = new Blob([jsonDataStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'ChatGPTPromptTemplate.json'
  link.click()
  URL.revokeObjectURL(url)
}

// 模板在线导入
const downloadPromptTemplate = async () => {
  try {
    await fetch(downloadURL.value)
      .then(response => response.json())
      .then((jsonData) => {
        tempPromptValue.value = JSON.stringify(jsonData)
      }).then(() => {
        importPromptTemplate()
      })
  }
  catch {
    message.error('网络导入出现问题，请检查网络状态与 JSON 文件有效性')
  }
}

// 移动端自适应相关
const renderTemplate = () => {
  const [keyLimit, valueLimit] = isMobile.value ? [6, 9] : [15, 50]

  return promptList.value.map((item: { key: string; value: string }) => {
    return {
      renderKey: item.key.length <= keyLimit ? item.key : `${item.key.substring(0, keyLimit)}...`,
      renderValue: item.value.length <= valueLimit ? item.value : `${item.value.substring(0, valueLimit)}...`,
      key: item.key,
      value: item.value,
    }
  })
}

const pagination = computed(() => {
  const [pageSize, pageSlot] = isMobile.value ? [6, 5] : [7, 15]
  return {
    pageSize, pageSlot,
  }
})

// table相关
const createColumns = (): DataTableColumns<DataProps> => {
  return [
    {
      title: '标题',
      key: 'renderKey',
      minWidth: 100,
    },
    {
      title: '内容',
      key: 'renderValue',
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      align: 'center',
      render(row) {
        return h('div', { class: 'flex items-center flex-col gap-2' }, {
          default: () => [h(
            NButton,
            {
              tertiary: true,
              size: 'small',
              type: 'info',
              onClick: () => changeShowModal('modify', row),
            },
            { default: () => '修改' },
          ),
          h(
            NButton,
            {
              tertiary: true,
              size: 'small',
              type: 'error',
              onClick: () => deletePromptTemplate(row),
            },
            { default: () => '删除' },
          ),
          ],
        })
      },
    },
  ]
}
const columns = createColumns()

watch(
  () => promptList,
  () => {
    promptStore.updatePromptList(promptList.value)
  },
  { deep: true },
)
</script>

<template>
  <NMessageProvider>
    <NModal v-model:show="show" style="width: 90%; max-width: 900px;" preset="card">
      <NCard>
	<div class="space-y-4" style="text-align: center; font-weight: bold;">
          <h2><a href="https://s1.locimg.com/2023/03/04/78bbf70e6f36b.gif" class="text-blue-500" target="_blank">👉食用指南</a></h2>
        </div>
        <div class="space-y-4">
          <NTabs type="segment">
            <NTabPane name="local" tab="本地管理">
              <NSpace justify="end">
                <NButton type="primary" @click="changeShowModal('add')">
                  添加
                </NButton>
                <NButton @click="changeShowModal('local_import')">
                  导入
                </NButton>
                <NButton strong secondary type="default" @click="exportPromptTemplate()">
                  导出
                </NButton>
                <NPopconfirm @positive-click="clearPromptTemplate">
                  <template #trigger>
                    <NButton>
                      清空
                    </NButton>
                  </template>
                  确认是否清空数据?
                </NPopconfirm>
              </NSpace>
              <br>
              <NDataTable
                :max-height="400"
                :columns="columns"
                :data="renderTemplate()"
                :pagination="pagination"
                :bordered="false"
              />
            </NTabPane>
            <NTabPane name="download" tab="在线导入">
              注意：请检查下载 JSON 文件来源，恶意的JSON文件可能会破坏您的计算机！<br><br>
              <NGrid x-gap="12" y-gap="12" :cols="24">
                <NGi :span="isMobile ? 18 : 22">
                  <NInput v-model:value="downloadURL" placeholder="请输入正确的 JSON 地址" />
                </NGi>
                <NGi>
                  <NButton strong secondary :disabled="downloadDisabled" @click="downloadPromptTemplate()">
                    下载
                  </NButton>
                </NGi>
              </NGrid>
              <NDivider />
              <NLayoutContent v-if="isMobile" style="height: 360px" content-style=" background:none;" :native-scrollbar="false">
                <NCard
                  v-for="info in promptRecommendList"
                  :key="info.key" :title="info.key"
                  style="margin: 5px;"
                  embedded
                  :bordered="true"
                >
                  {{ info.desc }}
                  <template #footer>
                    <NSpace justify="end">
                      <NButton text>
                        <a
                          :href="info.url"
                          target="_blank"
                        >
                          <SvgIcon class="text-xl" icon="ri:link" />
                        </a>
                      </NButton>
                      <NButton text @click="setDownloadURL(info.downloadUrl) ">
                        <SvgIcon class="text-xl" icon="ri:add-fill" />
                      </NButton>
                    </NSpace>
                  </template>
                </NCard>
              </NLayoutContent>
              <NLayoutContent
                v-else
                style="height: 360px"
                content-style="padding: 10px; background:none;"
                :native-scrollbar="false"
              >
                <NGrid x-gap="12" y-gap="12" :cols="isMobile ? 1 : 3">
                  <NGi v-for="info in promptRecommendList" :key="info.key">
                    <NCard :title="info.key" embedded :bordered="true">
                      {{ info.desc }}
                      <template #footer>
                        <NSpace justify="end">
                          <NButton text>
                            <a
                              :href="info.url"
                              target="_blank"
                            >
                              <SvgIcon class="text-xl" icon="ri:link" />
                            </a>
                          </NButton>
                          <NButton text @click="setDownloadURL(info.downloadUrl) ">
                            <SvgIcon class="text-xl" icon="ri:add-fill" />
                          </NButton>
                        </NSpace>
                      </template>
                    </NCard>
                  </NGi>
                </NGrid>
              </NLayoutContent>
            </NTabPane>
          </NTabs>
        </div>
      </NCard>
    </NModal>
    <NModal v-model:show="showModal">
      <NCard
        style="width: 600px"
        :bordered="false"
        size="huge"
        role="dialog"
        aria-modal="true"
      >
        <NSpace v-if="modalMode === 'add' || modalMode === 'modify'" vertical>
          模板标题
          <NInput v-model:value="tempPromptKey" placeholder="搜索" />
          模板内容
          <NInput v-model:value="tempPromptValue" placeholder="搜索" type="textarea" />
          <NButton
            strong
            secondary
            :style="{ width: '100%' }"
            :disabled="inputStatus"
            @click="() => { modalMode === 'add' ? addPromptTemplate() : modifyPromptTemplate() }"
          >
            确定
          </NButton>
        </NSpace>
        <NSpace v-if="modalMode === 'local_import'" vertical>
          <NInput
            v-model:value="tempPromptValue"
            placeholder="请粘贴json文件内容"
            :autosize="{ minRows: 3, maxRows: 15 }"
            type="textarea"
          />
          <NButton
            strong
            secondary
            :style="{ width: '100%' }"
            :disabled="inputStatus"
            @click="() => { importPromptTemplate() }"
          >
            导入
          </NButton>
        </NSpace>
      </NCard>
    </NModal>
  </NMessageProvider>
</template>
