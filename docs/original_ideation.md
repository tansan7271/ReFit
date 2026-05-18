[가칭: Persona Fit] 앱 기능 명세서 (Feature Specification)
1. 서비스 개요 (Overview)
핵심 가치: 경쟁 없는 오직 나만의 성장, 일상과 컨디션에 맞춘 초개인화 피트니스 & 웰니스 메이트
타겟 유저: 운동 습관을 형성하고 싶지만, 타인과의 비교(랭킹 등)에 피로감을 느끼며 귀여운 인터랙션에 반응하는 2030 세대
핵심 차별점: Gemini(LLM) 기반의 컨텍스트(날씨, 수면, 인바디 등) 맞춤형 알림과, 내 상태를 시각적으로 대변하는 인터랙티브 캐릭터
2. 유저 플로우 별 기능 명세
Phase 1: 초기 온보딩 (Onboarding)
UX 포인트: 첫 진입 시 유저의 높은 동기부여 상태를 활용하여, 초개인화 서비스를 위한 심층 데이터를 수집합니다.
목표 운동 루틴 등록
헬스: 요일별 타겟 부위 설정
러닝: 훈련 방식(LSD/인터벌/믹스) 및 요일 설정 (요일 선택은 Skip 가능)
목표 수면 루틴 등록: 기상/취침 목표 시간 설정
피지컬 프로필 설정:
운동 숙련도 선택 (초보자 / 숙련자)
(Option) 초기 인바디 수치 입력
페르소나(캐릭터) 생성: 입력된 데이터를 바탕으로 유저와 함께 성장할 초기 기본 캐릭터 지급
Phase 2: 일상 & 운동 전 (Context-Aware Pre-Workout)
UX 포인트: 온보딩 이후의 추가 입력은 최소화하고, 앱이 먼저 유저의 상태를 파악하여 Gemini(LLM) 기반의 맞춤형 푸시 알림을 제공합니다.
다이나믹 스마트 알림 (Push Notification)
식습관 연계: 운동 시간 역산하여 식사 타이밍 알림 ("운동 2시간 전이에요! 지금 식사를 마쳐주세요.")
수면 데이터 연계: 전날 수면 시간에 따른 강도 조절 ("어제 5시간밖에 못 잤네요. 오늘은 기록보다 폼 유지에 집중하며 살살 뛰어요!")
날씨 API 연계: 기상 상황에 따른 의상/장소 추천 ("비가 오네요 ☔️ 오늘은 실내 러닝머신 어때요?", "더우니까 얇은 기능성 티셔츠 추천!")
숙련도 & 인바디 연계: (초보자) "조금씩 늘려가는 게 중요해요!" / (숙련자) "오늘 하체 기록 경신 가볼까요?"
알림 썸네일 UI: 메시지 내용(날씨, 수면 부족, 동기부여 등)에 맞춰 푸시 알림 썸네일의 캐릭터 표정과 상태가 실시간으로 변화하여 제공됨.
Phase 3: 운동 중 (In-Workout Experience)
UX 포인트: 훈련 중 방해 요소를 최소화하고 시각적 즐거움만 제공합니다.
직관적인 대시보드: 복잡한 실시간 데이터(심박수 그래프 등)는 지양하고, 현재 시간/거리/세트 수 등 필수 정보만 큼직하게 표기
러닝 메이트 UI: 화면 하단 또는 배경에 내 캐릭터가 현재 페이스에 맞춰 함께 달리는(또는 운동하는) 귀여운 애니메이션 루프 제공
Phase 4: 운동 후 & 회복 (Post-Workout & Care)
UX 포인트: '운동의 완성은 회복'이라는 개념을 도입하여 다음 날 운동을 위한 컨디셔닝을 돕습니다.
자동 종료 인식: 일정 시간 움직임이 없거나 사용자가 '중지' 버튼 클릭 시 운동 세션 종료
애프터 케어 추천 (Gemini 활용):
소모 칼로리 및 운동 종류에 따른 보상 추천 ("포도당 캔디 한 알 드세요!", "수분 500ml 섭취 필수!")
수고했다는 격려 메시지와 함께 추가 릴렉스 활동 제안 ("다리가 많이 부었을 텐데, 오늘은 따뜻하게 반신욕 어때요?")
세션 리포트 요약: 오늘의 달성률, 운동 강도, 총 시간 등 심플한 요약 카드 제공
데이터 선순환: 오늘 수행한 강도와 피로도를 다음 날 '스마트 알림' 로직에 자동 반영
3. 앱 내부 시스템 & 게이미피케이션 (App Core Systems)
3.1 인터랙티브 캐릭터 시스템 (State-Machine UI)
상태 기반 외형 변화 (동적 UI):
수면 부족 시: 눈 밑에 다크서클 생김
식사(에너지) 부족 시: 배고파서 축 처진 모션
운동 직전: 피곤하거나 귀찮아하는 현실적인 표정
스트레칭/운동 완료 시: 가장 활기차고 쌩쌩하게 빛나는 애니메이션 (보상 심리 자극)
3.2 뱃지 & 도전 과제 (Achievement System)
인바디 개선, 연속 수면 달성, 궂은 날씨 극복 등의 활동에 따라 유니크한 뱃지 부여
캐릭터 주변을 꾸밀 수 있는 아이템으로 활용 가능
3.3 비경쟁적 소셜 기능 (Non-competitive Social)
랭킹 시스템 완전 배제: 타인과의 비교로 인한 스트레스 원천 차단
친구 시스템 (Co-op 중심):
가벼운 응원 찌르기 기능
'친구와 동 시간대 운동 완료', '함께 일주일 목표 달성' 시 삐까뻔쩍한 특수 Co-op 뱃지 부여 (경쟁이 아닌 '연대'에 포커스)
3.4 인바디 및 추가 데이터 업데이트
마이페이지 내 '인바디 업데이트' 탭 구성
강제 알림 없이 사용자가 원할 때(주 1회, 월 1회 등) 자발적으로 수치를 기입하도록 유도
4. 기술 스택 및 외부 API 연동 계획
AI Engine: Google Gemini API (사용자의 컨디션, 날씨, 운동 기록을 종합하여 자연스러운 알림 메시지 및 애프터케어 텍스트 생성)
Open Source: 차트 라이브러리(리포트용), 2D 캐릭터 스프라이트 애니메이션 라이브러리 (Lottie 등) 활용
External API: OpenWeather API (날씨 연동)


Problems to Solve
Many people experience difficulty systematically managing their physical condition before, during, and after exercise. For example, exercising immediately after eating without proper preparation or failing to perform adequate recovery and stretching can lead to prolonged muscle pain. In addition, abnormal physical symptoms during exercise, such as hypoglycemia or excessive fatigue, can be difficult for individuals to recognize or interpret, which may delay appropriate responses.
Related Experiences

Case 1 (by Team Member Ok Jimin):
When I first started running, I ran immediately after eating and experienced side pain. After the run, my calves were very tight and sore until the next day. This made me realize the importance of proper preparation before exercise and recovery after exercise, and the need for an app that can track factors like sleep and stress to manage physical condition.

Case 2 (by Team Member Song Subin):
After playing volleyball, I experienced severe hypoglycemia and remained semi-conscious for about two hours. I did not realize the cause at first, but recovered after eating a grape candy. This experience made me think that if exercise-related symptoms could be interpreted within the context of the workout, a faster response and recovery might have been possible.
Our Solution
ReFit: Recover your healthy workout routine
A mobile app that manages users’ physical condition throughout the workout flow, mainly focusing preparation before exercise and recovery after exercise. It tracks sleep, stress, and workout data to guide users through a healthier workout routine.

Tech Stack
Frontend - React Native
Backend - Fast API + MySQL
Design - Figma

Goal and Purpose
Purpose
Help users check their condition before exercise
Record and manage workout activities more enjoyable
Support post-workout recovery to prevent injuries

Goal
Help users maintain consistent workout habits
Make exercise management simple and engaging
Enable users to track their workout progress
Target Audience
ReFit is suitable for anyone in their 20s or under 30s who enjoys exercising.
General Fitness users who participate in running, weight training, or swimming can all take advantage of ReFit.
Especially, College students and office workers who want to manage their workouts consistently can use it effectively.
Feature List
Pre-Workout Status Notification
The application provides notifications at a user-defined time (e.g., 08:00 AM) to prompt users to check their physical condition and set their workout goals for the day in advance.

Pre- and Post-Workout Preparation and Stretching Support
Based on various data such as weather information and sleep index, the application provides guidance for proper workout preparation. It offers useful tips and insights, including stretching routines, recommended clothing, and suggested exercise intensity.

Customizable Notification Settings
Users can personalize the frequency and scope of notifications according to their preferences, such as receiving frequent notifications, minimal notifications, notifications throughout the day, or notifications limited only to pre- and post-workout periods.

Social Engagement Features
Personalized Character System
The application provides different characters based on the user's workout type and preferences. For example, a personal trainer character may guide running users, while a swimming instructor character may assist swimming users, helping support workout preparation and motivation.
Achievement-Based Badge System
Users can earn various badges depending on the type of workout and achievements they accomplish. These badges are designed to be collected similar to Boy Scout badges, encouraging a sense of achievement and collection through gamification.
Crew-Based Special Badges
When users form a crew and achieve workout goals together, they can earn special crew-exclusive badges that are more unique and meaningful than individual badges.
Goal-Oriented Gamification Design
The badge collection system is designed not merely as a collection feature, but as a motivational tool that encourages users to maintain a consistent workout flow, including pre-workout preparation, exercise performance, and post-workout recovery.