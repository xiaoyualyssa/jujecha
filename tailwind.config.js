/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAF8F5',      // 米白 · 页面底色
        warmgray: '#8B8680',   // 暖灰 · 次要文字
        blush: '#F5E6E8',      // 浅粉 · 情绪/温柔强调
        mist: '#E8EEF2',       // 淡蓝 · 身体/理性区块
        sage: '#5A7D7C',       // 墨绿 · 主色/标题强调
        'sage-dark': '#4A6B6A',
        'sage-light': '#E3ECEB',
        'blush-deep': '#D9A6AD',
        ink: '#3F3B36',        // 主文字 · 柔和深灰
      },
      fontFamily: {
        display: ['"Source Han Sans SC"', '"Source Han Soft"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        body: ['system-ui', '-apple-system', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: {
        xl2: '1.25rem',
        xl3: '1.75rem',
      },
      boxShadow: {
        soft: '0 8px 30px rgba(90, 125, 124, 0.08)',
        'soft-lg': '0 16px 50px rgba(90, 125, 124, 0.12)',
      },
    },
  },
  plugins: [],
}
