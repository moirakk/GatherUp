export type EventStatus = "草稿配置" | "数调中" | "待开放报名" | "报名中" | "即将截止" | "付款确认中" | "已成团" | "已结束";
export type EventCategory = "同好活动" | "校园活动" | "会议会务" | "好友聚会" | "工作坊" | "快闪/市集";
export type EventTemplate = "基础报名" | "报名收款" | "选座活动" | "签到活动" | "分时预约" | "记录型聚会";

export type GatherEvent = {
  id: string;
  name: string;
  category: EventCategory;
  template: EventTemplate;
  customTypeLabel: string;
  city: string;
  venue: string;
  address: string;
  startsAt: string;
  deadline: string;
  price: number;
  capacity: number;
  registered: number;
  paid: number;
  seated: number;
  status: EventStatus;
  allowMulti: boolean;
  maxPeoplePerOrder: number;
  orderPrefix: string;
  description: string;
};

export type Registration = {
  orderNumber: string;
  eventId: string;
  nickname: string;
  quantity: number;
  attendeeIds: string[];
  amount: number;
  registrationStatus: "已提交" | "已确认" | "候补" | "已取消";
  paymentStatus: "未付款" | "待审核" | "付款已确认" | "已驳回" | "已退款";
  seatStatus: string;
  createdAt: string;
  confirmationEta: string;
  paymentProof?: string;
  refundPolicy: string;
};

export type PollOption = {
  label: string;
  votes: number;
  selected?: boolean;
};

export type EventSetup = {
  eventId: string;
  setupStatus: "草稿配置" | "数调中" | "待开放报名" | "报名已开放";
  paymentQrStatus: "未配置" | "已配置";
  paymentMethod: "微信收款码" | "支付宝收款码" | "银行转账";
  surveyOptions: PollOption[];
  venueOptions: PollOption[];
  nextAction: string;
};

export const events: GatherEvent[] = [
  {
    id: "ryuichi-masterpiece",
    name: "《坂本龙一：杰作》线下观影",
    category: "同好活动",
    template: "选座活动",
    customTypeLabel: "线下观影",
    city: "上海",
    venue: "百丽宫影城 环贸店",
    address: "上海市徐汇区淮海中路999号",
    startsAt: "2026-06-22 14:30",
    deadline: "2026-06-18 23:59",
    price: 88,
    capacity: 60,
    registered: 42,
    paid: 31,
    seated: 24,
    status: "数调中",
    allowMulti: true,
    maxPeoplePerOrder: 4,
    orderPrefix: "RYU",
    description:
      "同好组织的线下观影活动。报名成功后请按订单金额付款并上传截图，组织者确认后开放选座。"
  },
  {
    id: "spring-rerun",
    name: "春日同好重映场",
    category: "同好活动",
    template: "选座活动",
    customTypeLabel: "线下观影",
    city: "杭州",
    venue: "浙影时代影城",
    address: "杭州市拱墅区湖墅南路",
    startsAt: "2026-06-29 19:00",
    deadline: "2026-06-25 22:00",
    price: 72,
    capacity: 32,
    registered: 26,
    paid: 18,
    seated: 0,
    status: "待开放报名",
    allowMulti: false,
    maxPeoplePerOrder: 1,
    orderPrefix: "SPR",
    description: "小规模重映观影活动，暂不开放多人报名。"
  },
  {
    id: "birthday-cafe-trial",
    name: "生日咖试运营小聚",
    category: "同好活动",
    template: "分时预约",
    customTypeLabel: "生咖",
    city: "南京",
    venue: "雾岛咖啡",
    address: "南京市玄武区长江路",
    startsAt: "2026-07-05 12:00",
    deadline: "2026-07-01 20:00",
    price: 45,
    capacity: 80,
    registered: 36,
    paid: 21,
    seated: 0,
    status: "报名中",
    allowMulti: true,
    maxPeoplePerOrder: 6,
    orderPrefix: "CAF",
    description: "生咖活动模板的早期探索，用于验证预约和报名体验。"
  },
  {
    id: "campus-club-fair",
    name: "春季社团招新开放日",
    category: "校园活动",
    template: "签到活动",
    customTypeLabel: "校园招新",
    city: "广州",
    venue: "岭南大学生活动中心",
    address: "广州市番禺区大学城",
    startsAt: "2026-07-12 10:00",
    deadline: "2026-07-10 22:00",
    price: 0,
    capacity: 300,
    registered: 186,
    paid: 0,
    seated: 0,
    status: "报名中",
    allowMulti: false,
    maxPeoplePerOrder: 1,
    orderPrefix: "CLUB",
    description: "校园社团联合开放日，支持报名、名单、签到和活动通知。"
  },
  {
    id: "product-forum",
    name: "城市青年消费趋势闭门论坛",
    category: "会议会务",
    template: "签到活动",
    customTypeLabel: "闭门会议",
    city: "北京",
    venue: "望京会议中心",
    address: "北京市朝阳区望京街道",
    startsAt: "2026-07-18 13:30",
    deadline: "2026-07-15 18:00",
    price: 199,
    capacity: 120,
    registered: 74,
    paid: 61,
    seated: 0,
    status: "付款确认中",
    allowMulti: true,
    maxPeoplePerOrder: 3,
    orderPrefix: "FORUM",
    description: "面向品牌方和活动组织者的闭门交流会，支持报名收款和现场签到。"
  },
  {
    id: "friends-hotpot",
    name: "周末火锅局",
    category: "好友聚会",
    template: "记录型聚会",
    customTypeLabel: "好友聚餐",
    city: "成都",
    venue: "玉林路附近",
    address: "成都市武侯区",
    startsAt: "2026-07-20 18:30",
    deadline: "2026-07-19 20:00",
    price: 0,
    capacity: 8,
    registered: 6,
    paid: 0,
    seated: 0,
    status: "报名中",
    allowMulti: true,
    maxPeoplePerOrder: 2,
    orderPrefix: "HOT",
    description: "朋友之间的小聚记录，适合记录参与人、费用、时间和地点。"
  }
];

export const eventSetups: EventSetup[] = [
  {
    eventId: "ryuichi-masterpiece",
    setupStatus: "数调中",
    paymentQrStatus: "已配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "6月21日 周日 14:00", votes: 18 },
      { label: "6月22日 周一 19:30", votes: 34, selected: true },
      { label: "6月23日 周二 19:30", votes: 27 }
    ],
    venueOptions: [
      { label: "百丽宫影城 环贸店", votes: 29, selected: true },
      { label: "大光明电影院", votes: 21 },
      { label: "百美汇影城 静安店", votes: 15 }
    ],
    nextAction: "确认数调和地点结果后，开放正式报名与付款截图上传。"
  },
  {
    eventId: "spring-rerun",
    setupStatus: "待开放报名",
    paymentQrStatus: "已配置",
    paymentMethod: "支付宝收款码",
    surveyOptions: [
      { label: "6月28日 周日 15:00", votes: 9 },
      { label: "6月29日 周一 19:00", votes: 17, selected: true }
    ],
    venueOptions: [
      { label: "浙影时代影城", votes: 16, selected: true },
      { label: "杭州百美汇影城", votes: 8 }
    ],
    nextAction: "报名可开放，等待组织者发布活动链接。"
  },
  {
    eventId: "campus-club-fair",
    setupStatus: "报名已开放",
    paymentQrStatus: "未配置",
    paymentMethod: "微信收款码",
    surveyOptions: [
      { label: "7月12日 周日 10:00", votes: 142, selected: true },
      { label: "7月12日 周日 14:00", votes: 98 }
    ],
    venueOptions: [
      { label: "大学生活动中心", votes: 156, selected: true },
      { label: "图书馆报告厅", votes: 72 }
    ],
    nextAction: "免费活动无需收款码，重点处理签到名单和现场动线。"
  }
];

export const registrations: Registration[] = [
  {
    orderNumber: "RYU-0001",
    eventId: "ryuichi-masterpiece",
    nickname: "比奇堡miki",
    quantity: 2,
    attendeeIds: ["GU-MIKI", "GU-TSUKI"],
    amount: 176,
    registrationStatus: "已确认",
    paymentStatus: "付款已确认",
    seatStatus: "C5, C6",
    createdAt: "2026-05-18",
    confirmationEta: "已确认",
    paymentProof: "wechat-pay-ryu-0001.jpg",
    refundPolicy: "开场前 48 小时可联系组织者登记退款，手续费按实际支付渠道规则处理。"
  },
  {
    orderNumber: "SPR-0007",
    eventId: "spring-rerun",
    nickname: "比奇堡miki",
    quantity: 1,
    attendeeIds: ["GU-MIKI"],
    amount: 72,
    registrationStatus: "已提交",
    paymentStatus: "待审核",
    seatStatus: "未开放",
    createdAt: "2026-05-18",
    confirmationEta: "预计 24 小时内确认",
    paymentProof: "alipay-spr-0007.jpg",
    refundPolicy: "活动未成团会原路退款；个人取消需在报名截止前联系组织者。"
  },
  {
    orderNumber: "SPR-0029",
    eventId: "spring-rerun",
    nickname: "比奇堡miki",
    quantity: 1,
    attendeeIds: ["GU-MIKI"],
    amount: 72,
    registrationStatus: "已提交",
    paymentStatus: "待审核",
    seatStatus: "未开放",
    createdAt: "2026-05-19",
    confirmationEta: "预计 24 小时内确认",
    paymentProof: "pending-upload-preview.jpg",
    refundPolicy: "活动未成团会原路退款；个人取消需在报名截止前联系组织者。"
  }
];

export function getEvent(eventId: string) {
  return events.find((event) => event.id === eventId) ?? events[0];
}

export function getEventRegistrations(eventId: string) {
  return registrations.filter((registration) => registration.eventId === eventId);
}

export function getEventSetup(eventId: string) {
  return eventSetups.find((setup) => setup.eventId === eventId) ?? eventSetups[0];
}

export function getRegistration(orderNumber: string) {
  return registrations.find((registration) => registration.orderNumber === orderNumber) ?? registrations[0];
}
