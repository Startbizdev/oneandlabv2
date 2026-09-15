export default defineAppConfig({
  toaster: {
    position: 'top-right' as const,
  },
  ui: {
    colors: {
      primary: 'primary',
      secondary: 'secondary',
      neutral: 'slate',
    },
    button: {
      slots: {
        base: 'rounded-xl font-medium justify-center',
        label: 'whitespace-normal text-center',
      },
      variants: {
        size: {
          xs: { base: 'min-h-9 min-w-9 px-2.5 py-1.5 text-xs gap-1.5' },
          sm: { base: 'min-h-11 min-w-11 px-3 py-2 text-sm gap-2' },
          md: { base: 'min-h-11 px-4 py-2.5 text-sm gap-2' },
          lg: { base: 'min-h-12 px-5 py-3 text-base gap-2' },
          xl: { base: 'min-h-12 px-6 py-3 text-base gap-2' },
        },
      },
      compoundVariants: [
        { color: 'primary', variant: 'solid', class: 'text-primary-950 hover:text-primary-950' },
        { color: 'primary', variant: 'outline', class: 'text-primary-900 dark:text-primary-300' },
        { color: 'primary', variant: 'ghost', class: 'text-primary-900 dark:text-primary-300' },
        { color: 'primary', variant: 'link', class: 'text-primary-900 dark:text-primary-300' },
      ],
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
      slots: { base: 'rounded-xl' },
      variants: { size: { md: { base: 'min-h-11 px-3 py-2.5 text-sm' } } },
      defaultVariants: {
        size: 'md',
      },
    },
    select: {
      slots: { base: 'rounded-xl' },
      variants: { size: { md: { base: 'min-h-11 px-3 py-2.5 text-sm' } } },
      defaultVariants: {
        size: 'md',
      },
    },
    textarea: {
      slots: { base: 'rounded-xl leading-relaxed' },
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
