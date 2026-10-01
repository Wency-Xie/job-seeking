(() => {
  const rows = (value, project=false) => String(value||"").split("\n").filter(Boolean).map(line=>{const p=line.split("｜");return {name:p[0]||"",role:p[1]||"",period:p[2]||"",description:project&&p.length>=5?(p[3]||"").replaceAll("\\n","\n"):"",detail:p.slice(project&&p.length>=5?4:3).join("｜").replaceAll("\\n","\n")};});
  const dates = period => {const m=period.match(/^(.*?)\s*(?:至|—|–|~|～)\s*(.*)$/);return m?[m[1],m[2]]:["",""];};
  globalThis.jobSeekingPlan = profile => {
    const plan=[];
    const add=(section,row,label,value,kind="text")=>{if(value?.trim())plan.push({section,row,label,value:value.trim(),kind});};
    const confirmChoice=(section,row,label,value)=>{if(value==="是"||value==="否")add(section,row,label,value,"choice");else plan.push({section,row,label,value:"",kind:"missing",reason:"档案尚未确认是／否"});};
    for(const [label,key,kind] of [["姓名","name"],["手机号","phone"],["邮箱","email"],["性别","gender","choice"],["国籍","nationality"],["民族","ethnicity","choice"],["籍贯","nativePlace","choice"],["证件号码","identityNumber"],["预计毕业时间","expectedGraduation","date"],["自我评价","selfIntro"]])add("个人信息",0,label,profile[key],kind);
    for(const [key,section] of [["educationExperience","教育经历"],["internshipExperience","实习经历"],["projectExperience","项目经历"],["practiceExperience","在校职务"]])rows(profile[key],key==="projectExperience").forEach((entry,index)=>{
      const [start,end]=dates(entry.period);
      if(section==="项目经历")add(section,index,"项目名称",entry.name);
      add(section,index,"开始时间",start,"date");add(section,index,"结束时间",end,"date");
      if(section==="教育经历") {const [degree,...major]=entry.role.split("／");add(section,index,"学校名称",entry.name);add(section,index,"学历",degree,"choice");add(section,index,"专业名称",major.join("／"));add(section,index,"主修专业课程",entry.detail);add(section,index,"学校所在地",profile[`extra_${key}_${index}_location`],"choice");}
      if(section==="实习经历") {confirmChoice(section,index,"专业相关实习/社会实践经历",profile.hasInternship);add(section,index,"单位名称",entry.name);add(section,index,"职位名称",entry.role);add(section,index,"实习/实践内容",entry.detail);}
      if(section==="项目经历"){add(section,index,"职务",entry.role);add(section,index,"项目描述",entry.description||entry.detail);}
      if(section==="在校职务"){confirmChoice(section,index,"在校担任过职务",profile.hasCampusRole);add(section,index,"职务名称",entry.role);add(section,index,"职务描述",entry.detail);}
    });
    if(!rows(profile.internshipExperience).length&&profile.hasInternship)confirmChoice("实习经历",0,"专业相关实习/社会实践经历",profile.hasInternship);
    if(!rows(profile.practiceExperience).length&&profile.hasCampusRole)confirmChoice("在校职务",0,"在校担任过职务",profile.hasCampusRole);
    rows(profile.skillItems).forEach((entry,index)=>{add("技能",index,"技能名称",entry.name);add("技能",index,"掌握程度",entry.role,"choice");add("技能",index,"技能相关证书",profile[`extra_skillItems_${index}_certificate`]);});
    const awardRows=rows(profile.awards);
    awardRows.forEach((entry,index)=>{confirmChoice("获奖情况",index,"在校获得荣誉或奖励",profile.hasAwards);add("获奖情况",index,"获奖级别",profile[`extra_awards_${index}_level`],"choice");add("获奖情况",index,"描述该荣誉或奖励",entry.detail.trim()||entry.name);});
    if(!awardRows.length&&profile.hasAwards)confirmChoice("获奖情况",0,"在校获得荣誉或奖励",profile.hasAwards);
    confirmChoice("论文/专著",0,"发表过学术期刊论文",profile.hasPublishedPaper);
    rows(profile.publications).forEach((entry,index)=>{if(profile[`extra_publications_${index}_status`]!=="已发表")return;add("论文/专著",index,"论文题目",entry.name);add("论文/专著",index,"发表期刊名称",entry.role);add("论文/专著",index,"发表时间",entry.period,"date");add("论文/专著",index,"作者顺序",profile[`extra_publications_${index}_authorOrder`]);add("论文/专著",index,"影响因子",profile[`extra_publications_${index}_impactFactor`]);});
    add("语言能力",0,"英文能力",profile.englishProficiency,"choice");
    const english=(profile.englishCertificates||"").split("｜").filter(Boolean); if(english.length) add("语言能力",0,"英语考试/证书",english.join("｜"),"choice");
    add("语言能力",0,"英语成绩/证书补充",profile.englishCertificateDetails);
    rows(profile.languageItems).forEach((entry,index)=>{add("语言能力",index,"其他语言能力",entry.name,"choice");add("语言能力",index,"其他语言掌握程度",entry.role,"choice");});
    const placeLabels=new Set(["民族","籍贯","学校所在地"]);
    return [...plan.filter(item=>!placeLabels.has(item.label)),...plan.filter(item=>placeLabels.has(item.label))];
  };
  globalThis.jobSeekingMokaPlan = profile => {
    const plan=[];
    const add=(section,row,label,value,kind="text")=>{if(String(value||"").trim())plan.push({section,row,label,value:String(value).trim(),kind});};
    for(const [label,key] of [["姓名","name"],["手机号码","phone"],["邮箱","email"]])add("个人信息",0,label,profile[key]);
    add("个人信息",0,"性别",profile.gender,"choice");
    add("个人信息",0,"出生日期 (年龄)",profile.birth,"date");
    add("个人信息",0,"最高学历",profile.degree,"choice");
    add("个人信息",0,"籍贯",profile.nativePlace,"choice");
    add("个人信息",0,"国家/地区",profile.nationality,"choice");
    add("个人信息",0,"毕业时间",profile.expectedGraduation,"date");
    add("个人信息",0,"到岗时间",profile.available,"choice");
    add("求职意向",0,"期望薪资",profile.salary);
    // A broad list of preferred cities is not a single application-city answer.
    const cities=String(profile.targetCity||"").split(/[、，,;/]/).map(x=>x.trim()).filter(Boolean);
    if(cities.length===1)add("求职意向",0,"期望城市",cities[0],"choice");
    rows(profile.internshipExperience).forEach((entry,index)=>{
      const [start,end]=dates(entry.period);
      add("实习经历",index,"起止时间",start,"date");
      add("实习经历",index,"结束时间",end,"date");
      add("实习经历",index,"公司名称",entry.name);
      add("实习经历",index,"职位名称",entry.role);
      add("实习经历",index,"工作职责",entry.detail);
    });
    return plan;
  };
  globalThis.jobSeekingBgiPlan = profile => {
    const plan=[];
    const add=(section,row,label,value,kind="text")=>{if(String(value||"").trim())plan.push({section,row,label,value:String(value).trim(),kind});};
    for(const [label,key] of [["姓名","name"],["手机号码","phone"],["邮箱","email"],["国籍","nationality"]])add("个人信息",0,label,profile[key]);
    add("个人信息",0,"性别",profile.gender,"choice");
    rows(profile.educationExperience).forEach((entry,row)=>{
      add("教育经历",row,"学校名称",entry.name);
      const [start,end]=dates(entry.period);
      add("教育经历",row,"开始时间",start,"date");
      add("教育经历",row,"结束时间",end,"date");
      add("教育经历",row,"专业名称",entry.role.split("／").slice(1).join("／"));
    });
    rows(profile.internshipExperience).forEach((entry,row)=>{
      add("实习经历",row,"单位名称",entry.name);
      const [start,end]=dates(entry.period);
      add("实习经历",row,"开始时间",start,"date");
      add("实习经历",row,"结束时间",end,"date");
      add("实习经历",row,"实习内容",entry.detail);
    });
    rows(profile.projectExperience,true).forEach((entry,row)=>{
      add("项目经历",row,"项目名称",entry.name);
      const [start,end]=dates(entry.period);
      add("项目经历",row,"开始时间",start,"date");
      add("项目经历",row,"结束时间",end,"date");
      add("项目经历",row,"项目描述",entry.description||entry.detail);
      add("项目经历",row,"项目中职责",entry.description?entry.detail:"");
    });
    return plan;
  };
})();
