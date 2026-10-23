package com.pinmate.team;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

// 팀 멤버 색상. 한 팀 안에서는 색이 겹치지 않는다 (team_members.uq_team_color)
public final class TeamColors {

	public static final List<String> PALETTE = List.of(
		"#6C63FF", "#FF6B6B", "#4CC9F0", "#06D6A0", "#FFD166",
		"#F72585", "#7209B7", "#3A0CA3", "#4361EE", "#4895EF"
	);

	private TeamColors() {
	}

	// 팀에서 아직 쓰지 않은 색상. 팔레트를 다 쓰면 무작위 색상 (members: TeamDAO.selectTeamMembers 결과)
	public static String pickUnused(List<Map<String, Object>> members) {
		Set<Object> used = members.stream()
			.map(m -> m.get("color"))
			.collect(Collectors.toSet());

		for (String c : PALETTE) {
			if (!used.contains(c)) {
				return c;
			}
		}
		return String.format("#%06X", (int) (Math.random() * 0xFFFFFF));
	}
}
