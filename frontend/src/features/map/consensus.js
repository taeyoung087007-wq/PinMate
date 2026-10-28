/** 지금 팀원 중 추천한 사람 수. 떠난 멤버의 추천은 세지 않는다 (서버의 모두 인정 판정과 같게) */
export const memberRecommendCount = (pin, members) =>
  pin.recommenders.filter(id => members.some(m => m.id === id)).length

/**
 * 과반 인정: 팀원이 3명 이상이고 추천이 절반을 넘었지만 아직 모두 인정은 아닌 장소.
 * 2명 팀은 과반이 곧 전원이라 모두 인정만 있다
 */
export const isMajority = (pin, members) =>
  !pin.isAllApproved && members.length >= 3 && memberRecommendCount(pin, members) * 2 > members.length
