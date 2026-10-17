# 5-Minute Video Presentation Script: Asset Intelligence Copilot
**Hacktoberfest 2026 Hack Day Pune &times; AI Hackers Collective**  
**Challenge:** Asset Intelligence Copilot Challenge (FlytBase)  
**Presenter:** Aditya Yadav &middot; **Model:** Google Gemma 4  

---

### [0:00 – 0:45] Introduction & The Operational Challenge
*(Camera on presenter / Title slide showing FlytBase Challenge & Gemma 4)*

> **Speaker:**  
> "Hello everyone! I'm Aditya Yadav, and today I'm presenting the **Asset Intelligence Copilot**, built for the FlytBase Asset Intelligence Challenge at Hacktoberfest Hack Day 2026.
> 
> In oil and gas production, an operator managing 200 wells across thousands of acres has to deal with massive data fragmentation: weekly drone inspections in one portal, maintenance work orders in another, strict environmental SOPs in lengthy manuals, and critical operational context locked inside human notes or unwritten memories.
> 
> When an operator asks a simple question like *'Which wells in my area were down the longest, and why?'*, it typically takes hours or days of manual correlation. Wells that quietly stop pumping or start leaking go unnoticed. Every day of delay means lost barrels, environmental damage, and hefty regulatory fines.
> 
> Our mission was to engineer the agentic layer that unifies this operational data into an intelligent copilot that delivers evidence-backed answers in seconds with dynamic Generative UI."

---

### [0:45 – 2:00] System Architecture & Agentic Design
*(Screen share showing the System Architecture Diagram from `writeup_system_design.md`)*

> **Speaker:**  
> "Here is our core architecture:
> 
> 1. **Data Indexer & Hot-Reload Engine:** We ingest 200 wells, over 39,000 weekly inspections, 5,700 repairs, 1,500 free-text reports, and SOPs into an in-memory typed index. When the final test dataset is dropped, our system reloads and indexes it in under 1.5 seconds via `/api/reload-dataset`.
> 
> 2. **Gemma 4 Multimodal Agent & Hybrid Analytics:** We power our copilot using Google's **Gemma 4** (`gemma-4-31b-it` / `gemma-4-26b-a4b-it`) through the official `google-genai` SDK. To guarantee 100% mathematical fidelity on downtime calculations, temperature deltas, and geospatial coordinates, Gemma 4 is paired with a deterministic analytical retrieval engine.
> 
> 3. **Two-Level Memory:**
>    - **Shared Knowledge:** When an operator submits a correction to raw sensor data or AI spill volumes, or announces a planned shut-in, it instantly updates the shared field knowledge for all team members.
>    - **Private User Memory:** Individual conversational context remains strictly isolated. If Michael Turner discusses three wells today, only Michael can recall them tomorrow; another operator asking the same question receives no unauthorized leak.
> 
> 4. **Conflict Honesty Protocol:** If an operator's claim contradicts raw physical sensor readings, the copilot doesn't silently pick a side—it highlights the discrepancy, cites the inspection evidence, and logs the claim as unconfirmed."

---

### [2:00 – 4:15] End-to-End Live Walkthrough & Use Cases
*(Screen share of the live web interface running on `http://localhost:8000`)*

> **Speaker:**  
> "Let's see this in action live in our Copilot UI.
> 
> **Use Case 1: Live Status & Generative UI (Q1)**  
> We start logged in as **Michael Turner**, Production Supervisor. Let's ask: *'Is WELL-0001 producing oil right now? Show me its status card.'*  
> *(Clicks Q1 chip)*  
> Immediately, the copilot renders an inline **Status Card**. It shows wellhead temperature is 22.4°C against 19.2°C ambient—a delta of only 3.2°C, which is below the 15°C threshold in manual OM-T200. The well is **NOT producing oil**. Furthermore, the copilot extracts human note CTX-0001-003 by Jake Morales explaining a planned shut-in for rod replacement, and alerts us that the system recorded status 'active' is out-of-date! Every cited document is clickable.
> 
> **Use Case 2: Multi-Turn Private Memory (Q6 & Q11)**  
> Now Michael asks: *'Which 3 wells in Northeast Block 7 had the most downtime in the last 4 months? Show a bar chart.'*  
> *(Clicks Q6 chip)*  
> The copilot renders an interactive bar chart: WELL-0121 with 49 days, WELL-0138 with 42 days, and WELL-0107 with 42 days.  
> 
> Next day, Michael starts a new chat and asks: *'For the three wells we discussed yesterday, what have repairs cost this year?'*  
> *(Clicks Q11 chip)*  
> Notice that Michael didn't name the wells! The copilot's private memory resolves the reference and returns a bar chart with the exact 2026 repair costs: WELL-0121 at $25,794, WELL-0138 at $46,942, and WELL-0107 at $5,176.
> 
> **Use Case 3: Shared Corrections & Multi-User Privacy (Q12, Q15, Q16)**  
> Next, Michael provides feedback: *'The 15 Oct reading for WELL-0164 is wrong. The handheld thermal gun was faulty; field crew re-measured at 41.0 °C.'*  
> *(Clicks Q12 chip)*  
> The copilot records the correction, updates WELL-0164 to producing oil, but alerts Michael that inspector Tyler Hughes noted 'Pump jack not moving', highlighting the mechanical conflict!  
> 
> Now, let's switch personas to **Jessica Reed**, Field Inspector.  
> Jessica asks: *'Is WELL-0164 producing oil right now?'*  
> She gets **Yes**, citing Michael's correction. Knowledge was shared across the team!  
> But if Jessica asks: *'For the three wells we discussed yesterday, what have repairs cost this year?'*  
> Look at the response: *'I do not have record of an earlier conversation discussing three specific wells with you.'* Private memory isolation is completely enforced!
> 
> **Use Case 4: Real-Time Contradiction Honesty (Q17)**  
> Switch to operator **Tyler Hughes**. Tyler types: *'WELL-0175 is running fine.'*  
> The copilot immediately flags: *'Conflict Detected with Sensor Data. Latest inspection shows wellhead only 0.4°C above air.'* It records Tyler's claim as unconfirmed rather than blindly trusting it."

---

### [4:15 – 5:00] Benchmark Evaluator & Conclusion
*(Navigates to the Benchmark Suite tab and clicks 'Run All 18 Benchmark Tests')*

> **Speaker:**  
> "Finally, let's look at our **Benchmark Suite**. We have automated validation for all 18 hackathon scenarios.  
> As you can see, every test—from 13-week thermal line charts and geospatial maps to 2D spill heatmaps and free-text containment mining—passes with **100% precision**.
> 
> By uniting Google Gemma 4's reasoning with robust domain grounding, two-level memory, and Generative UI, the Asset Intelligence Copilot empowers field crews to catch downtime early, comply with environmental safety, and make decisions with total confidence.
> 
> Our codebase is fully open-source and ready for the final test dataset drop. Thank you!"
