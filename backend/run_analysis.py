import pymysql
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import seaborn as sns
import matplotlib
import matplotlib.pyplot as plt
import os
import warnings
warnings.filterwarnings('ignore')

# 결과를 저장할 폴더 생성
output_dir = "analytics_charts"
os.makedirs(output_dir, exist_ok=True)

print("📊 데이터 분석 및 차트 생성을 시작합니다...")

# 1. DB 연결
conn = pymysql.connect(
    host='localhost', user='root', password='1234', 
    db='duru_db', charset='utf8mb4'
)

try:
    # ==========================================
    # 🎯 차트 1: 취약 유형(문법) 정답률 하락 (Bar Chart)
    # ==========================================
    print("1/3. 문제 유형별 정답률 분석 중...")
    query_accuracy = """
    SELECT question_type, AVG(is_correct) * 100 as accuracy
    FROM practice_results
    GROUP BY question_type
    """
    df_acc = pd.read_sql(query_accuracy, conn)
    
    # Plotly 인터랙티브 막대 차트 생성 (차분한 그라데이션 컬러)
    # 정답률 기준으로 높을수록 진한 색, 낮을수록 연한 색 → 취약점이 자연스럽게 눈에 들어옴
    gradient_colors = []
    for _, row in df_acc.iterrows():
        acc = row['accuracy']
        if acc >= 70:
            gradient_colors.append('#4A6FA5')   # 진한 네이비 블루 (정상)
        elif acc >= 50:
            gradient_colors.append('#7B9EC9')   # 중간 블루 (주의)
        else:
            gradient_colors.append('#B8CFEA')   # 연한 파스텔 블루 (취약)

    fig_acc = px.bar(df_acc, x='question_type', y='accuracy', 
                     title='문제 유형별 정답률 분석',
                     labels={'question_type': '문제 유형', 'accuracy': '정답률 (%)'},
                     text_auto='.1f')
    fig_acc.update_traces(marker_color=gradient_colors, marker_line_width=0)
    fig_acc.update_layout(
        title={
            'text': '<b>문제 유형별 정답률 분석</b>',
            'y':0.95,
            'x':0.5,
            'xanchor': 'center',
            'yanchor': 'top'
        },
        showlegend=False,
        plot_bgcolor='#FAFBFD',
        paper_bgcolor='#FAFBFD',
        font=dict(family='Malgun Gothic, sans-serif', size=13, color='#333'),
        title_font=dict(size=22, color='#2C3E50'), # 폰트 크기 키움
        yaxis=dict(gridcolor='#E8ECF1', range=[0, 100]),
        xaxis=dict(showgrid=False)
    )
    fig_acc.write_html(os.path.join(output_dir, '1_accuracy_bar.html'))

    # ==========================================
    # 🎯 차트 2: 문제 단계별 이탈률 (Funnel Chart)
    # ==========================================
    print("2/3. 퍼널(이탈률) 분석 중...")
    query_funnel = """
    SELECT question_index, COUNT(*) as count
    FROM practice_results
    GROUP BY question_index
    ORDER BY question_index
    """
    df_funnel = pd.read_sql(query_funnel, conn)
    
    # Plotly 인터랙티브 퍼널 차트 생성 (단계별 그라데이션)
    funnel_gradient = ['#2C3E6B', '#4A6FA5', '#7B9EC9', '#B8CFEA']  # 진한 → 연한 네이비 그라데이션
    fig_funnel = go.Figure(go.Funnel(
        y=[f'{i}번 문제 진입' for i in df_funnel['question_index']],
        x=df_funnel['count'],
        textinfo='value+percent initial',
        marker={'color': funnel_gradient, 'line': {'width': 0}},
        connector={'line': {'color': '#E8ECF1', 'width': 1}}
    ))
    fig_funnel.update_layout(
        title={
            'text': '<b>문제 단계별 중도 이탈률 분석</b>',
            'y':0.95,
            'x':0.5,
            'xanchor': 'center',
            'yanchor': 'top'
        },
        plot_bgcolor='#FAFBFD',
        paper_bgcolor='#FAFBFD',
        font=dict(family='Malgun Gothic, sans-serif', size=13, color='#333'),
        title_font=dict(size=22, color='#2C3E50'),
        margin=dict(l=150, r=150) # 좌우 여백을 늘려서 텍스트가 그래프에 더 가깝게(가운데 정렬 느낌) 붙도록 조정
    )
    fig_funnel.write_html(os.path.join(output_dir, '2_dropout_funnel.html'))

    # ==========================================
    # 🎯 차트 3: 가입 주차별 1주 후 잔존율 (Cohort Heatmap)
    # ==========================================
    print("3/3. 코호트(잔존율) 분석 중...")
    query_cohort = """
    SELECT 
        DATE_FORMAT(u.created_at, '%Y-%u') AS signup_week,
        ROUND(COUNT(DISTINCT s.user_id) * 100.0 / COUNT(DISTINCT u.id), 1) AS retention_rate
    FROM users u
    LEFT JOIN practice_sessions s ON u.id = s.user_id 
        AND s.created_at > u.created_at + INTERVAL 7 DAY
    GROUP BY 1
    ORDER BY 1;
    """
    df_cohort = pd.read_sql(query_cohort, conn)

    # 한글 폰트 설정 (Windows 기본 폰트인 맑은 고딕 사용)
    plt.rcParams['font.family'] = 'Malgun Gothic'
    plt.rcParams['axes.unicode_minus'] = False # 마이너스 폰트 깨짐 방지

    plt.figure(figsize=(10, 8))
    plt.gcf().set_facecolor('#FAFBFD')
    
    # 히트맵을 위한 데이터 전처리 (Index를 주차로 설정)
    df_cohort_hm = df_cohort.set_index('signup_week')
    
    # 구간별 색상 대비를 극대화하기 위해 동적 vmin/vmax 계산
    # 데이터 범위가 좁아도 최소 10포인트 차이를 보장하여 색상 구분이 명확하게 보이도록 함
    data_min = df_cohort_hm['retention_rate'].min()
    data_max = df_cohort_hm['retention_rate'].max()
    data_range = data_max - data_min
    
    if data_range < 10:
        # 범위가 좁으면 중심값 기준으로 ±5 범위를 잡아 색상 대비 극대화
        center = (data_min + data_max) / 2
        vmin = max(0, center - 5)
        vmax = min(100, center + 5)
    else:
        vmin = max(0, data_min - 2)
        vmax = min(100, data_max + 2)
    
    # Seaborn 히트맵 생성 (Blues: 높을수록 진한 파랑, 낮을수록 연한 하늘색)
    ax = sns.heatmap(df_cohort_hm, annot=True, cmap='Blues', fmt='.1f', 
                vmin=vmin, vmax=vmax,
                cbar_kws={'label': '잔존율 (%)'}, linewidths=.8, linecolor='#FAFBFD',
                annot_kws={'size': 13, 'weight': 'bold'})
    ax.set_facecolor('#FAFBFD')
    
    # 셀 밝기에 따라 텍스트 색상을 동적으로 조정 (어두운 배경 → 흰색, 밝은 배경 → 검정)
    cmap_obj = matplotlib.colormaps['Blues']
    norm = plt.Normalize(vmin=vmin, vmax=vmax)
    for text_obj in ax.texts:
        val = float(text_obj.get_text())
        rgba = cmap_obj(norm(val))
        # 밝기(luminance) 계산: 어두우면 흰색, 밝으면 검정
        luminance = 0.299 * rgba[0] + 0.587 * rgba[1] + 0.114 * rgba[2]
        text_obj.set_color('white' if luminance < 0.5 else '#2C3E50')
    
    plt.title('가입 주차별 1주 후 잔존율 (Cohort Heatmap)', fontsize=15, pad=20, color='#2C3E50')
    plt.ylabel('가입 주차 (Year-Week)', fontsize=12, color='#555')
    plt.xlabel('')
    plt.tight_layout()
    
    # 이미지 파일(PNG)로 저장
    plt.savefig(os.path.join(output_dir, '3_cohort_heatmap.png'), dpi=300, facecolor='#FAFBFD')

    print(f"\n🎉 분석 완료! 결과물이 '{output_dir}/' 폴더에 저장되었습니다.")
    print(" - 1_accuracy_bar.html (더블클릭하여 웹 브라우저에서 확인하세요)")
    print(" - 2_dropout_funnel.html (더블클릭하여 웹 브라우저에서 확인하세요)")
    print(" - 3_cohort_heatmap.png (이미지 파일)")

finally:
    conn.close()
