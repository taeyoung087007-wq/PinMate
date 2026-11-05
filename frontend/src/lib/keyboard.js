/**
 * role="button" 로 만든 카드에서 클릭과 같이 취급할 키.
 * - Enter / Space 만 활성화한다 (Tab·방향키 등은 브라우저 기본 동작에 맡긴다)
 * - 'Spacebar' 는 구형 브라우저가 쓰는 key 값
 */
export const isActivationKey = key => key === 'Enter' || key === ' ' || key === 'Spacebar'
