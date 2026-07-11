// 出生地经度表：真太阳时校正用（东经，单位度）
// 校正规则：真太阳时 ≈ 北京时间 + (当地经度 - 120°) × 4 分钟
export interface CityInfo { name: string; lng: number }

export const CITIES: CityInfo[] = [
  { name: '北京', lng: 116.41 }, { name: '天津', lng: 117.2 }, { name: '上海', lng: 121.47 },
  { name: '重庆', lng: 106.55 }, { name: '广州', lng: 113.26 }, { name: '深圳', lng: 114.06 },
  { name: '成都', lng: 104.07 }, { name: '杭州', lng: 120.15 }, { name: '武汉', lng: 114.31 },
  { name: '西安', lng: 108.94 }, { name: '南京', lng: 118.8 }, { name: '苏州', lng: 120.58 },
  { name: '郑州', lng: 113.63 }, { name: '长沙', lng: 112.94 }, { name: '沈阳', lng: 123.43 },
  { name: '青岛', lng: 120.38 }, { name: '大连', lng: 121.61 }, { name: '厦门', lng: 118.09 },
  { name: '福州', lng: 119.3 }, { name: '昆明', lng: 102.83 }, { name: '贵阳', lng: 106.63 },
  { name: '南宁', lng: 108.37 }, { name: '海口', lng: 110.32 }, { name: '兰州', lng: 103.83 },
  { name: '西宁', lng: 101.78 }, { name: '银川', lng: 106.23 }, { name: '乌鲁木齐', lng: 87.62 },
  { name: '拉萨', lng: 91.14 }, { name: '哈尔滨', lng: 126.63 }, { name: '长春', lng: 125.32 },
  { name: '石家庄', lng: 114.51 }, { name: '太原', lng: 112.55 }, { name: '呼和浩特', lng: 111.75 },
  { name: '合肥', lng: 117.23 }, { name: '南昌', lng: 115.89 }, { name: '济南', lng: 117.12 },
  { name: '香港', lng: 114.17 }, { name: '澳门', lng: 113.55 }, { name: '台北', lng: 121.56 },
  { name: '汕头', lng: 116.68 }, { name: '温州', lng: 120.7 }, { name: '宁波', lng: 121.55 },
  { name: '无锡', lng: 120.31 }, { name: '佛山', lng: 113.12 }, { name: '东莞', lng: 113.75 },
  { name: '洛阳', lng: 112.45 }, { name: '徐州', lng: 117.28 }, { name: '烟台', lng: 121.45 },
  { name: '柳州', lng: 109.42 }, { name: '桂林', lng: 110.29 },
]

export function solarOffsetMinutes(lng: number): number {
  return Math.round((lng - 120) * 4)
}
