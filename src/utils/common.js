function debounceAfter(fn, delay = 500) {
    // timer 是在闭包中的
    let timer = null;

    return function () {
        if (timer) {
            clearTimeout(timer)
        }
        timer = setTimeout(() => {
            fn.apply(this, arguments)
            timer = null
        }, delay)
    }
}
/**
 * 创建防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
function debounce(fn, delay = 1000) {
    let timer = null
    let pending = false

    return async function (...args) {
        if (pending) return

        pending = true
        try {
            await fn.apply(this, args)
        } finally {
            timer = setTimeout(() => {
                pending = false
            }, delay)
        }
    }
}

export { debounceAfter, debounce }
