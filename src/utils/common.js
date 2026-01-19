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
function getFormattedDate() {
    const date = new Date();

    const pad = (num, length = 2) => num.toString().padStart(length, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // 月份从0开始，需要+1
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    const milliseconds = pad(date.getMilliseconds(), 3); // 毫秒需要补齐3位

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
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

export { debounceAfter, debounce, getFormattedDate }