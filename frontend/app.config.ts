export default defineAppConfig({
  toaster: {
    position: 'top-right' as const,
  },
  ui: {
    colors: {
      primary: 'blue',
      neutral: 'slate',
    },
    button: {
      defaultVariants: {
        size: 'md',
        color: 'primary',
        variant: 'solid',
      },
    },
    badge: {
      defaultVariants: {
        size: 'md',
        variant: 'subtle',
        color: 'primary',
      },
    },
    input: {
      defaultVariants: {
        size: 'md',
      },
    },
    select: {
      defaultVariants: {
        size: 'md',
      },
    },
    textarea: {
      defaultVariants: {
        size: 'md',
      },
    },
    formField: {
      defaultVariants: {
        size: 'md',
      },
    },
  },
})
