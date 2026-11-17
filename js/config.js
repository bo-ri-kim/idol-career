// Prototype tuning lives here. Expected news counts are stochastic, not quotas.
export const config = {
  dayMs: 240000 / 365, speeds: [1, 2, 4, 8], maxAge: 45,
  maxSkipDays: 366 * 2, frameDayBudget: 120,
  newsPerMonth: {entry:3, trainee:3, debut:5, group:6.5, solo:6, actor:3.5, producer:3, rest:2},
  probability: {auditionBase:.14, auditionWeight:.009, debutBase:.08, skillWeight:.007,
    trainingWeight:.008, rivalWeight:.004, supportBonus:.08, min:.05, max:.95},
  project: {announce:30, candidates:80, cut:115, final:150, result:30},
};
export const policies = {
  vocal:{label:'보컬 집중',hint:'보컬 성장↑ · 다른 분야 성장↓ · 피로 누적',growth:{보컬:2.5,댄스:.25,랩:.15},fatigue:.8},
  dance:{label:'댄스 집중',hint:'댄스 성장↑ · 다른 분야 성장↓ · 피로 누적',growth:{댄스:2.5,보컬:.25,랩:.15},fatigue:.9},
  rap:{label:'랩 집중',hint:'랩·창작 성장↑ · 기초 실력 성장↓',growth:{랩:2.5,보컬:.25,스타성:.3},fatigue:.7},
  balanced:{label:'균형 훈련',hint:'고른 성장 · 완만한 피로 누적',growth:{보컬:1,댄스:1,랩:.7,연기:.4,스타성:.3},fatigue:.4},
  rest:{label:'컨디션 관리',hint:'체력·멘탈 회복↑ · 실력 성장↓ · 활동 수입↓',growth:{보컬:.15,연기:.15},fatigue:-3},
  promotion:{label:'팬·방송 활동',hint:'인지도 성장↑ · 실력 성장↓ · 체력 소모',growth:{스타성:1.5,연기:.4},fatigue:1.1},
  craft:{label:'작품에 집중',hint:'주력 실력·창작 성장↑ · 홍보 효과↓',growth:{보컬:1.2,랩:1.1,연기:1.5},fatigue:.6},
};
export const policyIds = stage => ['entry','trainee','debut'].includes(stage)
  ? ['vocal','dance','rap','balanced','rest'] : ['craft','promotion','balanced','rest'];
