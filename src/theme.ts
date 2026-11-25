import { createTheme, type MantineColorsTuple } from '@mantine/core'

const primary: MantineColorsTuple = [
  '#ebf6f1',
  '#d7ede2',
  '#c3e3d4',
  '#afdac6',
  '#85c8aa',
  '#57b58f',
  '#3aab82',
  '#2ed3a0',
  '#01a275',
  '#018c65',
]

const accent: MantineColorsTuple = [
  '#f5e9ff',
  '#e6ccff',
  '#d4a9ff',
  '#c285ff',
  '#b262ff',
  '#a53fff',
  '#9a02ff',
  '#8a00e6',
  '#7900cc',
  '#6800b3',
]

export const theme = createTheme({
  colors: { primary, accent },
  primaryColor: 'primary',
  primaryShade: 8,
  defaultRadius: 'md',
  fontFamily: 'exo_2, Inter, system-ui, -apple-system, Segoe UI, sans-serif',
  headings: {
    fontFamily: 'michroma, exo_2, sans-serif',
    fontWeight: '400',
  },
  components: {
    Button: { defaultProps: { radius: 'xl' } },
    Card: { defaultProps: { radius: 'lg' } },
    Paper: { defaultProps: { radius: 'lg' } },
    TextInput: { defaultProps: { radius: 'md' } },
    Select: { defaultProps: { radius: 'md' } },
    Textarea: { defaultProps: { radius: 'md' } },
    Badge: { defaultProps: { radius: 'xl' } },
    ActionIcon: { defaultProps: { radius: 'md' } },
  },
})

export default theme
