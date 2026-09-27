---
layout: default
title: JIS AI Manager
---

<h1 align="center">JIS Program Manager, Artificial Intelligence Application</h1>


## Application Materials
- [*Curriculum Vitae*](/files/C.L.Sampson-CV-JIS.pdf)
- [Cover letter](/files/Sampson-AI-Program-Manager-Coverletter.pdf)


## Leadsbot
- [Leadsbot](https://leadsbot.sampson.info) - This app is a vibe coded CRM built for my wife's insurance business. It originally started as a spreadsheet replacement so that she could keep track of leads she had contacted for follow up. Over time it has grown to a full lifecycle CRM including lead identification (Google Business data), conversion of lead to client, and ongoing client management. The log in below has view only privileges:
	- Username: guest@sampson.info
	- Password: qhKwFo#V9c$F

## Ask my Hermes agent about me
<section class="jis-ask" aria-labelledby="jis-ask-heading">
  <h2 id="jis-ask-heading">Ask the JIS knowledge base</h2>
  <p>Ask a question about the JIS materials. Answers come from the Markdown knowledge base.</p>
  <form id="jis-ask-form">
    <label for="jis-question">Your question</label>
    <textarea id="jis-question" name="question" rows="3" maxlength="2000" required placeholder="What experience do I bring to the AI Program Manager role?"></textarea>
    <button id="jis-ask-button" type="submit">Ask</button>
  </form>
  <p id="jis-status" role="status" aria-live="polite" hidden></p>
  <div id="jis-answer" aria-live="polite" hidden></div>
</section>

<style>
  .jis-ask { border: 1px solid #cbd5e1; border-radius: 10px; padding: 1.25rem; margin: 1.5rem 0 2rem; background: #f8fafc; }
  .jis-ask h2 { margin-bottom: .5rem; }
  .jis-ask label { display: block; font-weight: 700; margin-bottom: .4rem; }
  .jis-ask textarea { display: block; width: 100%; font: inherit; padding: .75rem; border: 1px solid #94a3b8; border-radius: 6px; resize: vertical; }
  .jis-ask button { margin-top: .75rem; padding: .65rem 1.2rem; border: 0; border-radius: 6px; background: #3242a8; color: white; font: inherit; cursor: pointer; }
  .jis-ask button:disabled { opacity: .6; cursor: wait; }
  #jis-status { margin: .75rem 0 0; }
  #jis-answer { margin-top: 1rem; padding: 1rem; border-left: 4px solid #3242a8; background: white; white-space: pre-wrap; overflow-wrap: anywhere; }
</style>

<script>
(() => {
  const endpoint = "https://jis-ask.cls-sampson.workers.dev/ask";
  const form = document.getElementById("jis-ask-form");
  const question = document.getElementById("jis-question");
  const button = document.getElementById("jis-ask-button");
  const status = document.getElementById("jis-status");
  const answer = document.getElementById("jis-answer");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const value = question.value.trim();
    if (!value) return;
    button.disabled = true;
    status.hidden = false;
    status.textContent = "Searching the knowledge base…";
    answer.hidden = true;
    answer.textContent = "";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: value }),
        signal: controller.signal
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "The question could not be answered.");
      if (typeof data.answer !== "string" || !data.answer.trim()) throw new Error("Hermes returned an empty answer.");
      answer.textContent = data.answer;
      answer.hidden = false;
      status.textContent = "Answer ready.";
    } catch (error) {
      status.textContent = error.name === "AbortError"
        ? "The request took too long. Please try again."
        : (error instanceof TypeError ? "The knowledge base is unavailable. Please try again later." : error.message);
    } finally {
      clearTimeout(timeout);
      button.disabled = false;
    }
  });
})();
</script>


## PDQ Elements
- [Essential Job Functions](#functions)
- [Minimum Qualifications](#qualifications)
- [Knowledge of](#knowledge)
- [Skill in](#skill)
- [Ability to](#ability)
- [Software and Computer Skills](#comp-skills)

### <a id="functions"></a>Essential Job Functions:  

- The AI Program Manager is responsible for planning, implementing, and overseeing the Maryland Judiciary's Artificial Intelligence (AI) program. The position manages the development of internally developed AI solutions
	- As an existing member of the AI Governance Subcommittee and AI User Group, I have working knowledge of existing internally developed AI solutions. Additionally, I have a general understanding of the product road map. I view AIDA as evolving into a platform beyond mere chatbot functionality.

- Evaluates AI technologies requested by business units
	- My experience in the Procurement subgroup provides knowledge of the existing request pipeline. My experience at a trial court and AOC provides direct knowledge of business unit needs. The philosophical approach I would adopt is to base solutions on workflows, rather than identifying tools to build workflows around.

- <a id="research"></a>Researches emerging AI capabilities
	- Researching emerging AI is my hobby. Spare moments are spent listening to informative and entertaining podcasts such as [Security Now](https://www.grc.com/securitynow.htm) and [Philosophy, Programs, and Prompts](https://www.youtube.com/channel/UCOVFG_uMBQ1psEIWDdLUOkQ), and [Intelligent Machines](https://twit.tv/shows/intelligent-machines). I enjoy reading [Simon Willison’s blog](https://simonwillison.net/), [3 Geeks and a Law Blog](https://www.geeklawblog.com/), and [Hacker News](https://news.ycombinator.com/) for daily news. I am an active member of several Discord communities focused on legal tech and AI specifically. I enjoy reading research papers on emerging AI technology such as world models, new flavors of reasoning (such as [JEV](https://typesafe.ai/blog/introducing-system-one-models-and-jev)), and emerging neural network architectures ([Logical Intelligence's Kona](https://logicalintelligence.com/kona), for example). I think the future of AI will be an ecosystem of neural network models built for specific purposes with specific characteristics and constraints.

- Oversees the portfolio of all AI initiatives and technologies
	- The opportunities for AI applications to augment and assist Judiciary staff seems almost limitless. I view adoption by staff as the most pressing initial challenge. The group can build great tools, but if staff do not want to adopt them, all the effort is for naught. I think this position needs to think very carefully how to communicate with AI resistant staff.

- <a id="policy"></a>participates in the development and ongoing refinement of Judiciary AI guidelines and policies.
	- My work as a contributor to the existing AI Use Policy, as well as my contributions to the MSBA law firm AI use templates demonstrates my leadership in AI policy development. As part of my MLS, I took a course on Information Goverance taught by a founding member of the [Sedona Conference](https://www.thesedonaconference.org/publication/Commentary_on_Information_Governance), Jason Baron. I believe effective policy design is just as important as building great tools

- The incumbent works across business and technology divisions to ensure AI solutions align with organizational objectives, security requirements, and Judiciary AI guidelines.
	- Over many years of work at the Judiciary, I have crossed paths with many offices and governance units. I heard the conversations that went in to developing the Mission and Vision statements. My past experience and current collaboration with Judiciary leadership support my alignment with organizational objectives. As an information professional, I understand the security concerns with AI systems. Lawyers are also highly concerned with data security because it has implications for privilege and case outcomes. 


- Manage and supervise the Judiciary's AI development team, including work assignment, performance management, mentoring, prioritization of projects, and professional development of assigned staff.
	- I currently manage a small team of two staff members who assist with administration of the People's Law Library. One staff member came to the library with some technology skills, but no experience with web development. Another staff member came to the team from a public library without any background in technology. Over the years they have each built their skills far beyond where they started. I am comfortable acting as a mentor when needed and monitoring activity to ensure projects remain on schedule. 
	- I am also aware of areas where I need to continue to develop my skills. I would love to work with a development team that can improve my coding and software development skills. I have earned two advanced degress while working full time, so I'm no stranger to hard work. I would greatly appreciate a mentor or two at JIS to help me develop both in terms of technology skills and management skills. 


- <a id="planning"></a>Direct and oversee the Maryland Judiciary's enterprise Artificial Intelligence program, including strategic planning, AI roadmap development, oversight and coordination of AI initiatives, and program implementation.
	- I think the Judiciary has a solid foundation of **top-down leadership** from the AI Governance Subcommittee and **bottom-up leadership** in the AI User Group. I think there is room for more communication from different business units. Some folks find it challenging to speak up in a big group like the AI User Group. I would like to have set "office hours" where myself and other team members are available for one-on-one chats. Additionally, I think there are other ways to increase communication. The AI group could publish a newsletter or blog to make folks aware of new features and ongoing development. We could publish a podcast that sometimes has a chat show format or sometimes an interview format. I see these communication possibilities as critical for boosting staff adoption of new AI tools.

- Lead the evaluation, selection, and implementation of AI technologies requested by Judiciary business units to ensure alignment with business needs, security standards, and Judiciary AI guidelines and policies.
	- I think the emphasis here has to be on workflows. It is very easy to see a fancy new tool and think "how can I use that?" A better approach is logical analysis of the existing workflow, then determining a future more efficient state, and deciding from there what the best solution is to improve the workflow. A new AI tool or off the shelf software may not be the right answer. My colleague Rebecca Fordon [recently published an article](https://www.ailawlibrarians.com/2026/09/21/six-questions-and-three-tests-before-you-adopt-an-ai-tool/) that encapsulates my view on this.

- Oversee the design, development, implementation, maintenance, and support of internally developed AI solutions, automation tools, and productivity applications. Leads cross- functional teams engaged in AI initiatives. 
	- My experience with the People's Law Library provides a solid jumping off point to managing development of several software solutions at once. 

- Research emerging AI technologies, industry trends, and best practices, and provide recommendations regarding adoption of new capabilities that support Judiciary business objectives.
	- [See my response regarding emerging AI capabilities above](#research)

- Participate in the development, review, and ongoing refinement of Judiciary and JIS specific AI guidelines, standards, and policies and ensure approved AI solutions continue to comply with established requirements. 
	- [See my response regarding AI policies above](#policy)

- Collaborate with business units, Information Technology, Information Security, Legal, Procurement, and executive leadership to identify opportunities for responsible AI adoption and process improvement.
	- Many years of managing a technology project at the law library has established relationships with folks working in each of these capacities. My existing network of relationships would mean no ramp up time for this position and I would be fully ready to hit the ground running. 

- <a id="briefing"></a>Prepare executive briefings, reports, presentations, and recommendations related to AI initiatives, adoption, and program performance.
	- My career demonstrates a long history of communicating with executives and Judiciary leadership. I feel very comfortable developing plans and goals that align with the Judiciary's strategic goals and effectively communicating plans and outcomes to leadership. 

### <a id="qualifications"></a>Minimum Qualifications:

- **Education:** Bachelor?s Degree from an accredited college or university.
	- My education exceeds the minimum qualifications.

- **Experience:** Six (6) years of progressively responsible experience managing enterprise technology initiatives, information technology programs, digital transformation initiatives, software development, Artificial Intelligence technologies, or a closely related field. One (1) year of supervisory or management experience.
	- I have managed the People's Law Library legal information website since 2017. In that capacity I have been responsible for the entire project including
		- project planning and goal setting
		- procurement
		- development
		- testing & deployment
		- ongoing management
	- I have been a manager and part of the library management team since 2019.


### <a id="knowledge"></a>Knowledge of:

- Enterprise Artificial Intelligence technologies and concepts. 
	- I am familiar with Azure AI foundary. I also think that [Copilot Studio](https://learn.microsoft.com/en-us/microsoft-copilot-studio/fundamentals-what-is-copilot-studio) could be a useful tool for distributing custom applications to staff.

- AI-assisted software development.
	- The [Leadsbot](#Leadsbot) CRM mentioned above is entirely AI coded.

- AI implementation strategies. 
	- The biggest challenge here is user training and acceptance.

- Enterprise technology governance. 
	- See response to the [policy essential function above](#policy).

- Information security principles. 

- Software development lifecycle. 

- Cloud technologies. 

- Business analysis.

- Project and program management methodologies. 

- Change management principles. 

- Public sector technology operations.

### <a id="skill"></a>Skill in: 

- Researching emerging AI technologies, industry trends and best practices to provide recommendations.
	- [See my response regarding emerging AI capabilities above](#research)

### <a id="ability"></a>Ability to:

- Prepare executive briefings, reports, presentations, and recommendations related to AI initiatives, adoptions and program performance.
	- [See my response regarding briefing above](#briefing)

- Collaborate with units and leaders to identify opportunities for AI adoption and process improvement.
	- [See my response to strategic planning above](#planning)

- Lead cross-functional teams engaged in AI initiatives.

### <a id="comp-skills"></a>Software and Computer Skills:

- Microsoft 365. Microsoft Teams. Microsoft Copilot. Azure AI Services. Azure OpenAI. SharePoint. GitHub CoPilot. Power BI. Microsoft Project. Visio. Microsoft Purview. Microsoft Defender. MDEC and other Judiciary applications as required

