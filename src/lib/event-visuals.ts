import type { EventCategory } from "@/lib/mock-data";

type EventVisual = {
  alt: string;
  position?: string;
  src: string;
};

const visualsByEventId: Record<string, EventVisual> = {
  "ryuichi-masterpiece": {
    alt: "观众坐在影院内等待电影放映",
    position: "center 62%",
    src: "/images/events/cinema.jpg"
  },
  "spring-rerun": {
    alt: "观众在影院内等待银幕亮起",
    position: "center 58%",
    src: "/images/events/cinema-screen.jpg"
  },
  "birthday-cafe-trial": {
    alt: "朋友们在咖啡馆围桌交流",
    position: "center 46%",
    src: "/images/events/cafe.jpg"
  },
  "campus-club-fair": {
    alt: "学生们在校园空间内共同讨论",
    position: "center 52%",
    src: "/images/events/campus.jpg"
  },
  "product-forum": {
    alt: "观众在会场观看台上演讲",
    position: "center 58%",
    src: "/images/events/conference.jpg"
  },
  "friends-hotpot": {
    alt: "朋友们并肩坐在户外相聚",
    position: "center 52%",
    src: "/images/events/gathering.jpg"
  }
};

const fallbackVisuals: Record<EventCategory, EventVisual> = {
  同好活动: visualsByEventId["ryuichi-masterpiece"],
  校园活动: visualsByEventId["campus-club-fair"],
  会议会务: visualsByEventId["product-forum"],
  好友聚会: visualsByEventId["friends-hotpot"],
  工作坊: visualsByEventId["campus-club-fair"],
  "快闪/市集": visualsByEventId["birthday-cafe-trial"]
};

export function getEventVisual(eventId: string, category: EventCategory) {
  return visualsByEventId[eventId] ?? fallbackVisuals[category];
}
