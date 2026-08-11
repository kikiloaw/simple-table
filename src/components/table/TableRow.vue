<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <tr
    :class="
      cn(
        'transition-colors st-row',
        props.class,
      )
    "
    v-bind="delegatedProps"
  >
    <slot />
  </tr>
</template>
