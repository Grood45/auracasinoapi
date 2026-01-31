/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: '#6366f1',
                    hover: '#4f46e5',
                },
                bg: '#0f172a',
                'card-bg': 'rgba(30, 41, 59, 0.7)',
                text: '#f8fafc',
                'text-dim': '#94a3b8',
            },
        },
    },
    plugins: [],
}
