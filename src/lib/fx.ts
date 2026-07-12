// 素材路径统一出口：跟随部署 base（GitHub Pages 在 /bugua/ 子路径下）并带版本号防缓存
// 换素材（文件名不变）时把 FX_VERSION +1，所有浏览器会强制换新
export const FX_VERSION = 2

export const fx = (file: string) => `${import.meta.env.BASE_URL}fx/${file}?v=${FX_VERSION}`
