/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // ── Color System ────────────────────────────────────────────────────────
      colors: {
        // Primary brand — professional blue
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        // Navy — sidebar, headers
        navy: {
          50:  '#f0f5ff',
          100: '#e0eaff',
          200: '#c7d7fe',
          300: '#a5b8fd',
          400: '#8192f8',
          500: '#6366f1',
          600: '#4338ca',
          700: '#2a2d9e',
          800: '#1a1d7a',
          900: '#0f2744',
          950: '#060d1a',
        },
        // Clinical surface tones
        surface: {
          0:   '#ffffff',
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
        },
        // Status colors — controlled palette
        success: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        danger: {
          50:  '#fff1f2',
          100: '#ffe4e6',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
        },
        // Accent — cyan for healthcare feel
        accent: {
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
      },

      // ── Typography Scale ─────────────────────────────────────────────────────
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
        'xs':  ['0.75rem',  { lineHeight: '1rem' }],
        'sm':  ['0.8125rem',{ lineHeight: '1.25rem' }],
        'base':['0.875rem', { lineHeight: '1.5rem' }],
        'md':  ['1rem',     { lineHeight: '1.5rem' }],
        'lg':  ['1.125rem', { lineHeight: '1.75rem' }],
        'xl':  ['1.25rem',  { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem',   { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem',  { lineHeight: '2.5rem' }],
        '5xl': ['3rem',     { lineHeight: '1' }],
        '6xl': ['3.75rem',  { lineHeight: '1' }],
        '7xl': ['4.5rem',   { lineHeight: '1' }],
        '8xl': ['6rem',     { lineHeight: '1' }],
        '9xl': ['8rem',     { lineHeight: '1' }],
      },

      // ── Shadow System ────────────────────────────────────────────────────────
      boxShadow: {
        'xs':        '0 1px 2px rgba(0,0,0,0.05)',
        'sm':        '0 1px 3px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
        'DEFAULT':   '0 2px 8px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'md':        '0 4px 16px rgba(0,0,0,0.07), 0 2px 6px rgba(0,0,0,0.04)',
        'lg':        '0 8px 30px rgba(0,0,0,0.08), 0 3px 10px rgba(0,0,0,0.05)',
        'xl':        '0 16px 50px rgba(0,0,0,0.1),  0 6px 20px rgba(0,0,0,0.06)',
        '2xl':       '0 32px 80px rgba(0,0,0,0.14), 0 12px 40px rgba(0,0,0,0.08)',
        'card':      '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover':'0 12px 40px rgba(0,0,0,0.1),  0 4px 16px rgba(0,0,0,0.06)',
        'brand':     '0 4px 20px rgba(37,99,235,0.35)',
        'brand-lg':  '0 8px 40px rgba(37,99,235,0.45)',
        'glow-blue': '0 0 40px rgba(37,99,235,0.3), 0 0 80px rgba(37,99,235,0.1)',
        'glow-cyan': '0 0 40px rgba(6,182,212,0.3)',
        'inner-sm':  'inset 0 1px 3px rgba(0,0,0,0.08)',
        'inner-brand':'inset 0 0 0 1px rgba(37,99,235,0.2)',
        'none':      'none',
      },

      // ── Border Radius ────────────────────────────────────────────────────────
      borderRadius: {
        'none': '0',
        'sm':   '0.375rem',   //  6px
        'DEFAULT': '0.5rem',  //  8px
        'md':   '0.625rem',   // 10px
        'lg':   '0.75rem',    // 12px
        'xl':   '1rem',       // 16px
        '2xl':  '1.25rem',    // 20px
        '3xl':  '1.5rem',     // 24px
        '4xl':  '2rem',       // 32px
        'full': '9999px',
      },

      // ── Spacing ──────────────────────────────────────────────────────────────
      spacing: {
        '4.5': '1.125rem',
        '5.5': '1.375rem',
        '6.5': '1.625rem',
        '7.5': '1.875rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '17': '4.25rem',
        '18': '4.5rem',
        '22': '5.5rem',
        '26': '6.5rem',
        '30': '7.5rem',
        '34': '8.5rem',
        '68': '17rem',
        '76': '19rem',
        '84': '21rem',
        '88': '22rem',
        '92': '23rem',
        '100': '25rem',
        '104': '26rem',
        '112': '28rem',
        '120': '30rem',
        '128': '32rem',
      },

      // ── Transitions ──────────────────────────────────────────────────────────
      transitionTimingFunction: {
        'out-expo':    'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-expo': 'cubic-bezier(0.87, 0, 0.13, 1)',
        'out-quart':   'cubic-bezier(0.25, 1, 0.5, 1)',
        'elastic':     'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'bounce-out':  'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '0':   '0ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
        '300': '300ms',
        '400': '400ms',
        '500': '500ms',
        '600': '600ms',
        '700': '700ms',
        '800': '800ms',
        '1000':'1000ms',
        '1500':'1500ms',
        '2000':'2000ms',
      },

      // ── Animation ────────────────────────────────────────────────────────────
      animation: {
        'fade-in':       'fadeIn 0.4s ease-out forwards',
        'fade-in-up':    'fadeInUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in-down':  'fadeInDown 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-left': 'slideInLeft 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'slide-in-right':'slideInRight 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
        'scale-in':      'scaleIn 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards',
        'float':         'float 6s ease-in-out infinite',
        'float-slow':    'floatSlow 8s ease-in-out infinite',
        'pulse-subtle':  'pulseSubtle 2.5s ease-in-out infinite',
        'shimmer':       'shimmer 2.5s linear infinite',
        'gradient-x':    'gradientX 4s ease infinite',
        'counter':       'counterUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'spin-slow':     'spin 8s linear infinite',
        'bounce-gentle': 'bounceGentle 3s ease-in-out infinite',
        'ping-slow':     'ping 3s cubic-bezier(0,0,0.2,1) infinite',
        'orbit':         'orbit 12s linear infinite',
      },
      keyframes: {
        fadeIn:       { '0%': {opacity:'0'}, '100%': {opacity:'1'} },
        fadeInUp:     { '0%': {opacity:'0',transform:'translateY(20px)'}, '100%': {opacity:'1',transform:'translateY(0)'} },
        fadeInDown:   { '0%': {opacity:'0',transform:'translateY(-20px)'}, '100%': {opacity:'1',transform:'translateY(0)'} },
        slideInLeft:  { '0%': {opacity:'0',transform:'translateX(-24px)'}, '100%': {opacity:'1',transform:'translateX(0)'} },
        slideInRight: { '0%': {opacity:'0',transform:'translateX(24px)'}, '100%': {opacity:'1',transform:'translateX(0)'} },
        scaleIn:      { '0%': {opacity:'0',transform:'scale(0.88)'}, '100%': {opacity:'1',transform:'scale(1)'} },
        float:        { '0%,100%':{transform:'translateY(0)'}, '50%':{transform:'translateY(-12px)'} },
        floatSlow:    { '0%,100%':{transform:'translateY(0)'}, '50%':{transform:'translateY(-8px)'} },
        pulseSubtle:  { '0%,100%':{opacity:'0.6',transform:'scale(1)'}, '50%':{opacity:'1',transform:'scale(1.08)'} },
        shimmer:      { '0%':{backgroundPosition:'-200% 0'}, '100%':{backgroundPosition:'200% 0'} },
        gradientX:    { '0%,100%':{backgroundPosition:'0% 50%'}, '50%':{backgroundPosition:'100% 50%'} },
        counterUp:    { '0%':{opacity:'0',transform:'translateY(8px)'}, '100%':{opacity:'1',transform:'translateY(0)'} },
        bounceGentle: { '0%,100%':{transform:'translateY(0)'}, '50%':{transform:'translateY(-6px)'} },
        orbit:        { from:{transform:'rotate(0deg) translateX(120px) rotate(0deg)'}, to:{transform:'rotate(360deg) translateX(120px) rotate(-360deg)'} },
      },

      // ── Backdrop blur ────────────────────────────────────────────────────────
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '40px',
        '3xl': '64px',
      },

      // ── Z-index scale ────────────────────────────────────────────────────────
      zIndex: {
        '0':  0,
        '10': 10,
        '20': 20,
        '30': 30,
        '40': 40,
        '50': 50,
        '60': 60,    // dropdowns
        '70': 70,    // tooltips
        '80': 80,    // modals
        '90': 90,    // notifications
        '100':100,   // top layer
      },

      // ── Aspect ratios ────────────────────────────────────────────────────────
      aspectRatio: {
        '4/3':  '4 / 3',
        '3/2':  '3 / 2',
        '16/9': '16 / 9',
        '2/1':  '2 / 1',
        '1/1':  '1 / 1',
      },

      // ── Grid ─────────────────────────────────────────────────────────────────
      gridTemplateColumns: {
        'dashboard': 'repeat(auto-fill, minmax(280px, 1fr))',
        'kpi-4':     'repeat(4, minmax(0, 1fr))',
        'kpi-3':     'repeat(3, minmax(0, 1fr))',
        'sidebar-main': '260px 1fr',
        'sidebar-main-collapsed': '72px 1fr',
      },

      // ── Max width ────────────────────────────────────────────────────────────
      maxWidth: {
        'prose-sm': '55ch',
        'content':  '1280px',
        'wide':     '1440px',
        'full':     '100%',
      },

      // ── Background gradients ─────────────────────────────────────────────────
      backgroundImage: {
        // App surface gradients
        'surface-gradient':   'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
        'sidebar-gradient':   'linear-gradient(180deg, #0f2744 0%, #0a1628 100%)',
        'card-shimmer':       'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
        // Brand gradients
        'brand-gradient':     'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
        'brand-gradient-v':   'linear-gradient(180deg, #3b82f6 0%, #1e40af 100%)',
        'cyan-gradient':      'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
        'premium-gradient':   'linear-gradient(135deg, #2563eb 0%, #06b6d4 50%, #818cf8 100%)',
        // Status gradients
        'success-gradient':   'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
        'warning-gradient':   'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        'danger-gradient':    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
        // Dot / grid patterns
        'dot-pattern':        'radial-gradient(circle, rgba(37,99,235,0.15) 1px, transparent 1px)',
        'grid-pattern':       'linear-gradient(rgba(37,99,235,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.05) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-28':  '28px 28px',
        'grid-48': '48px 48px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms')({
      strategy: 'class', // only apply to elements with class="form-input" etc.
    }),
  ],
}
