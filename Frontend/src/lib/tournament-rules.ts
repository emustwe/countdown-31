// Official tournament Rule Book + Terms & Conditions, in English and Korean, shown in the
// gated pre-entry flow. Kept as plain data so the modal can render + flip each item.

export interface RuleItem {
  titleEn: string;
  titleKo: string;
  bodyEn: string;
  bodyKo: string;
}

export const RULE_BOOK: RuleItem[] = [
  {
    titleEn: "Rule 1. Eligibility",
    titleKo: "Rule 1. 참가 자격",
    bodyEn: "Only registered players with a valid tournament entry may participate.",
    bodyKo: "참가권을 구매한 회원만 토너먼트에 참가할 수 있습니다.",
  },
  {
    titleEn: "Rule 2. Registration",
    titleKo: "Rule 2. 참가 시간",
    bodyEn: "Players must register before the tournament starts. Late entries are not allowed.",
    bodyKo: "토너먼트 시작 전까지만 참가가 가능하며, 시작 후에는 참가할 수 없습니다.",
  },
  {
    titleEn: "Rule 3. Tournament Schedule",
    titleKo: "Rule 3. 경기 시간",
    bodyEn: "Each round begins and ends at the official scheduled time.",
    bodyKo: "각 라운드는 지정된 시간에만 진행되며 종료 후 자동 마감됩니다.",
  },
  {
    titleEn: "Rule 4. Equal Conditions",
    titleKo: "Rule 4. 동일한 조건",
    bodyEn: "All players compete using the same slot game and starting credits.",
    bodyKo: "모든 참가자는 동일한 슬롯 게임, 시작 크레딧으로 플레이합니다.",
  },
  {
    titleEn: "Rule 5. Ranking",
    titleKo: "Rule 5. 순위 결정",
    bodyEn: "Players are ranked based on their final tournament score.",
    bodyKo: "라운드 종료 시 가장 높은 점수를 기록한 플레이어가 상위 순위를 차지합니다.",
  },
  {
    titleEn: "Rule 6. Group Stage",
    titleKo: "Rule 6. 그룹 스테이지",
    bodyEn: "Qualification rounds are played in groups, and only the designated number of players advance.",
    bodyKo: "예선은 그룹별로 진행되며 각 그룹에서 정해진 인원만 다음 라운드로 진출합니다.",
  },
  {
    titleEn: "Rule 7. Final Round",
    titleKo: "Rule 7. 결승전",
    bodyEn: "Qualified players compete in one final match to determine the overall rankings.",
    bodyKo: "최종 진출자는 하나의 결승 라운드에서 경쟁하며 최종 순위가 결정됩니다.",
  },
  {
    titleEn: "Rule 8. Prize Pool",
    titleKo: "Rule 8. 상금 지급",
    bodyEn: "Total win price goes to the Top 10 players.",
    bodyKo: "총 우승 상금은 상위 10명에게 지급됩니다.",
  },
  {
    titleEn: "Rule 9. Tie Breaker",
    titleKo: "Rule 9. 동점 처리",
    bodyEn: "If scores are tied, the player who achieved the score first receives the higher rank.",
    bodyKo: "동점일 경우 먼저 점수를 달성한 참가자가 높은 순위를 차지합니다.",
  },
  {
    titleEn: "Rule 10. Time Limit",
    titleKo: "Rule 10. 시간 종료",
    bodyEn: "Play ends immediately when the round timer expires.",
    bodyKo: "시간이 종료되면 게임은 즉시 종료되며 추가 플레이는 인정되지 않습니다.",
  },
  {
    titleEn: "Rule 11. Re-Buy-In",
    titleKo: "Rule 11. 리바이인",
    bodyEn: "An eliminated player may re-buy-in to rejoin the next round, but only before the Semi-Final. Weekly allows one re-buy-in and Monthly allows two. Once eliminated in the Semi-Final, re-buy-in is no longer available.",
    bodyKo: "탈락한 플레이어는 준결승 전까지 다음 라운드에 재참가하기 위해 리바이인할 수 있습니다. 주간 토너먼트는 1회, 월간 토너먼트는 2회 가능하며, 준결승에서 탈락하면 리바이인할 수 없습니다.",
  },
  {
    titleEn: "Rule 12. Connection Issues",
    titleKo: "Rule 12. 네트워크 장애",
    bodyEn: "Tournament time continues even if a player disconnects. Reconnection is allowed only within the remaining time.",
    bodyKo: "인터넷이 끊겨도 토너먼트 시간은 계속 진행되며 재접속 시 남은 시간만 플레이할 수 있습니다.",
  },
  {
    titleEn: "Rule 13. System Errors",
    titleKo: "Rule 13. 시스템 오류",
    bodyEn: "Only verified platform system errors may result in a match restart or rescheduling.",
    bodyKo: "플랫폼의 공식 시스템 오류가 확인될 경우에만 운영진이 경기 재진행 여부를 결정합니다.",
  },
  {
    titleEn: "Rule 14. Account Policy",
    titleKo: "Rule 14. 계정 정책",
    bodyEn: "One account per player. Multiple accounts will result in disqualification.",
    bodyKo: "1인 1계정만 참가 가능하며 중복 계정은 실격 처리됩니다.",
  },
  {
    titleEn: "Rule 15. Fair Play",
    titleKo: "Rule 15. 부정행위 금지",
    bodyEn: "Bots, macros, cheating, hacking, and account sharing are strictly prohibited.",
    bodyKo: "매크로, 봇, 해킹, 계정 공유 등 모든 부정행위는 즉시 실격됩니다.",
  },
  {
    titleEn: "Rule 16. Official Results",
    titleKo: "Rule 16. 경기 결과",
    bodyEn: "All rankings are based on official server records, which are final.",
    bodyKo: "모든 기록은 서버 데이터를 기준으로 하며 서버 기록이 최종 결과입니다.",
  },
  {
    titleEn: "Rule 17. Prize Distribution",
    titleKo: "Rule 17. 상금 지급 일정",
    bodyEn: "Prizes are distributed automatically according to the tournament payout schedule.",
    bodyKo: "상금은 토너먼트 종료 후 운영 정책에 따라 자동 지급됩니다.",
  },
  {
    titleEn: "Rule 18. Tournament Administration",
    titleKo: "Rule 18. 운영진 권한",
    bodyEn: "The organizer reserves the right to modify schedules when necessary to ensure fair competition.",
    bodyKo: "운영진은 공정한 진행을 위해 필요한 경우 경기 일정을 변경하거나 조정할 수 있습니다.",
  },
  {
    titleEn: "Rule 19. Appeals",
    titleKo: "Rule 19. 이의 신청",
    bodyEn: "Appeals must be submitted within the official appeal period after the tournament ends.",
    bodyKo: "결과에 대한 이의는 토너먼트 종료 후 지정된 기간 내에만 접수 가능합니다.",
  },
  {
    titleEn: "Rule 20. Final Decision",
    titleKo: "Rule 20. 최종 결정",
    bodyEn: "All decisions made by the tournament administration are final.",
    bodyKo: "운영진의 최종 결정은 모든 참가자에게 적용됩니다.",
  },
  {
    titleEn: "Rule 21. Acceptance of Rules",
    titleKo: "Rule 21. 규정 동의",
    bodyEn: "By entering the tournament, all players agree to comply with these Official Tournament Rules.",
    bodyKo: "토너먼트에 참가하는 모든 플레이어는 본 룰북에 동의한 것으로 간주됩니다.",
  },
];

export const TERMS: RuleItem[] = [
  {
    titleEn: "Article 1. Tournament Authority",
    titleKo: "제1조 운영진의 최종 권한",
    bodyEn: "The Organizer reserves the sole and final authority over all tournament operations, interpretations, and decisions.",
    bodyKo: "모든 토너먼트의 운영, 해석 및 최종 결정 권한은 운영진에게 있습니다.",
  },
  {
    titleEn: "Article 2. Schedule Changes",
    titleKo: "제2조 일정 변경",
    bodyEn: "The Organizer may modify, postpone, or reschedule any tournament due to maintenance, technical issues, or unforeseen circumstances.",
    bodyKo: "운영진은 시스템 점검, 기술적 문제 또는 불가피한 사유로 토너먼트 일정 및 시간을 변경 또는 연기할 수 있습니다.",
  },
  {
    titleEn: "Article 3. Tournament Cancellation",
    titleKo: "제3조 토너먼트 취소",
    bodyEn: "The Organizer reserves the right to cancel any tournament when necessary. Entry fees or compensation will be handled according to company policy.",
    bodyKo: "예상치 못한 상황 발생 시 토너먼트를 취소할 수 있으며, 참가비 및 보상은 운영 정책에 따라 처리됩니다.",
  },
  {
    titleEn: "Article 4. System Errors",
    titleKo: "제4조 시스템 오류",
    bodyEn: "In the event of system failures, server issues, or game malfunctions, the Organizer may void, replay, or amend tournament results.",
    bodyKo: "시스템 오류, 서버 장애 또는 게임 오류 발생 시 운영진은 해당 경기의 무효, 재경기 또는 결과 변경을 결정할 수 있습니다.",
  },
  {
    titleEn: "Article 5. Official Server Records",
    titleKo: "제5조 서버 기록 우선",
    bodyEn: "Official server records are the only valid source for scores, rankings, and tournament results.",
    bodyKo: "모든 경기 기록, 점수 및 결과는 서버 데이터가 최종 기준입니다.",
  },
  {
    titleEn: "Article 6. Connection Responsibility",
    titleKo: "제6조 네트워크 책임",
    bodyEn: "Players are responsible for their own internet connection, devices, and network stability.",
    bodyKo: "참가자의 인터넷 환경, 기기 문제 또는 통신 장애로 발생한 불이익은 참가자의 책임입니다.",
  },
  {
    titleEn: "Article 7. Account Security",
    titleKo: "제7조 계정 보안",
    bodyEn: "Players are responsible for maintaining the security of their accounts. The Organizer is not liable for account sharing or unauthorized access.",
    bodyKo: "계정 관리 및 보안은 참가자의 책임이며, 계정 공유 또는 타인 사용으로 발생한 문제는 보상되지 않습니다.",
  },
  {
    titleEn: "Article 8. Investigation",
    titleKo: "제8조 부정행위 조사",
    bodyEn: "The Organizer may investigate tournament logs and player activity before or after the tournament.",
    bodyKo: "운영진은 경기 종료 후에도 로그 및 데이터를 검토하여 부정행위를 조사할 수 있습니다.",
  },
  {
    titleEn: "Article 9. Prize Hold",
    titleKo: "제9조 상금 보류",
    bodyEn: "Prize payments may be suspended while an investigation is ongoing.",
    bodyKo: "부정행위가 의심되는 경우 조사가 완료될 때까지 상금 지급을 보류할 수 있습니다.",
  },
  {
    titleEn: "Article 10. Prize Revocation",
    titleKo: "제10조 상금 회수",
    bodyEn: "Any prize awarded may be revoked if cheating or rule violations are discovered after payment.",
    bodyKo: "이미 지급된 상금이라도 부정행위가 확인될 경우 회수될 수 있습니다.",
  },
  {
    titleEn: "Article 11. Disqualification",
    titleKo: "제11조 실격",
    bodyEn: "The Organizer may immediately disqualify any player who violates the tournament rules.",
    bodyKo: "부정행위 또는 규정 위반 시 사전 통보 없이 실격 처리될 수 있습니다.",
  },
  {
    titleEn: "Article 12. Right to Refuse Entry",
    titleKo: "제12조 참가 제한",
    bodyEn: "The Organizer reserves the right to refuse or restrict participation at its discretion.",
    bodyKo: "운영진은 특정 참가자의 토너먼트 참가를 제한하거나 거부할 수 있습니다.",
  },
  {
    titleEn: "Article 13. Refund Policy",
    titleKo: "제13조 환불 정책",
    bodyEn: "Entry fees are non-refundable once the tournament has started.",
    bodyKo: "토너먼트 시작 이후에는 참가비 환불이 불가능합니다.",
  },
  {
    titleEn: "Article 14. Data Retention",
    titleKo: "제14조 기록 보관",
    bodyEn: "Tournament data and match records may be stored for operational and regulatory purposes.",
    bodyKo: "모든 경기 기록은 운영 목적으로 저장 및 보관될 수 있습니다.",
  },
  {
    titleEn: "Article 15. Public Results",
    titleKo: "제15조 개인정보",
    bodyEn: "Player nicknames, rankings, and tournament results may be published for tournament operation and promotional purposes.",
    bodyKo: "닉네임, 순위 및 경기 결과는 토너먼트 운영 및 홍보 목적으로 공개될 수 있습니다.",
  },
  {
    titleEn: "Article 16. Rule Amendments",
    titleKo: "제16조 운영 변경",
    bodyEn: "The Organizer reserves the right to modify tournament rules whenever necessary.",
    bodyKo: "운영진은 보다 공정한 운영을 위해 토너먼트 규정을 변경할 수 있습니다.",
  },
  {
    titleEn: "Article 17. Force Majeure",
    titleKo: "제17조 불가항력",
    bodyEn: "The Organizer shall not be liable for delays or disruptions caused by events beyond its reasonable control, including natural disasters, power outages, or internet failures.",
    bodyKo: "천재지변, 인터넷 장애, 전력 문제 등 운영진이 통제할 수 없는 상황에 대해서는 책임을 지지 않습니다.",
  },
  {
    titleEn: "Article 18. Limitation of Liability",
    titleKo: "제18조 책임 제한",
    bodyEn: "The Organizer shall not be liable for losses resulting from technical issues or player-side equipment and connectivity problems.",
    bodyKo: "운영사는 기술적 장애 또는 참가자의 개인 환경으로 발생한 손실에 대해 책임을 지지 않습니다.",
  },
  {
    titleEn: "Article 19. Rule Interpretation",
    titleKo: "제19조 규정 해석",
    bodyEn: "The Organizer has the exclusive right to interpret these Terms and Conditions.",
    bodyKo: "규정 해석에 대한 최종 권한은 운영진에게 있습니다.",
  },
  {
    titleEn: "Article 20. Acceptance",
    titleKo: "제20조 약관 동의",
    bodyEn: "Participation in any tournament constitutes full acceptance of these Terms and Conditions.",
    bodyKo: "토너먼트에 참가하는 모든 참가자는 본 이용약관에 동의한 것으로 간주됩니다.",
  },
];
