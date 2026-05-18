export type EventStatus = "报名中" | "即将截止" | "付款确认中" | "已成团" | "已结束";

export type GatherEvent = {
  id: string;
  name: string;
  type: "线下观影" | "生咖";
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
};

export const events: GatherEvent[] = [
  {
    id: "ryuichi-masterpiece",
    name: "《坂本龙一：杰作》线下观影",
    type: "线下观影",
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
    status: "报名中",
    allowMulti: true,
    maxPeoplePerOrder: 4,
    orderPrefix: "RYU",
    description:
      "同好组织的线下观影活动。报名成功后请按订单金额付款并上传截图，组织者确认后开放选座。"
  },
  {
    id: "spring-rerun",
    name: "春日同好重映场",
    type: "线下观影",
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
    status: "即将截止",
    allowMulti: false,
    maxPeoplePerOrder: 1,
    orderPrefix: "SPR",
    description: "小规模重映观影活动，暂不开放多人报名。"
  },
  {
    id: "birthday-cafe-trial",
    name: "生日咖试运营小聚",
    type: "生咖",
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
    createdAt: "2026-05-18"
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
    createdAt: "2026-05-18"
  }
];

export function getEvent(eventId: string) {
  return events.find((event) => event.id === eventId) ?? events[0];
}

export function getEventRegistrations(eventId: string) {
  return registrations.filter((registration) => registration.eventId === eventId);
}
