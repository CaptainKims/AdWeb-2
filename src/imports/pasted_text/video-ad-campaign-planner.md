Design a complex enterprise web application for ordering and planning video advertising campaigns across broadcast TV, streaming platforms, and social media video channels.
The product should feel like a hybrid between:
	•	Figma (structured workspace)
	•	Google Ads (campaign hierarchy)
	•	Monday.com (modular planning)
	•	Professional broadcast media planning tools
	•	Modern SaaS enterprise design systems
STYLE DIRECTION:
Clean Scandinavian enterprise design.
Professional, trustworthy media company feel.
Use: TV2 tokens Minimal color noise Clear hierarchy Dense but readable layout
Avoid: Marketing site visuals Consumer ecommerce UI Playful styles Oversized padding
Think: Enterprise planning tool used daily by professionals.

PRODUCT PURPOSE:
Users order and plan advertising campaigns consisting of:
Campaign → Media streams (channels/platforms) → Ad placements → Creatives (video assets)
Users include:
Media agencies (expert users) SMBs (low experience) Internal planners Sales staff
System must support:
Template campaigns Copy existing campaigns Custom campaign building Timeline media planning Creative management Budget allocation Frequency weighting Multi-channel distribution

CORE OBJECT MODEL:
Campaign:
	•	Name
	•	Advertiser
	•	Agency
	•	Start date
	•	End date
	•	Budget
	•	Goal
	•	Status
Media stream:
	•	Channel type (Broadcast / Streaming / Social)
	•	Budget allocation
	•	Reach estimate
	•	Frequency target
	•	Flighting
Placement:
	•	Format
	•	Duration
	•	Dayparting
	•	Targeting
	•	Inventory availability
Creative:
	•	Video asset
	•	Length
	•	Version
	•	Format compatibility

PRIMARY NAVIGATION STRUCTURE:
Left sidebar navigation:
Campaigns Orders Creatives Inventory Reports Admin
Top bar:
Search Notifications User profile Campaign status indicator Save status

MAIN USER FLOW:
CREATE CAMPAIGN ENTRY SCREEN
Design a "Create Campaign" screen with 4 large selectable cards:
Use template Copy existing campaign Quick campaign Advanced builder
Each card should include: Icon Description Complexity level indicator Recommended user type

TEMPLATE GALLERY SCREEN
Grid layout of campaign templates.
Each template card should show:
Template name Campaign goal Channel mix visualization Duration Budget distribution chart Expected reach estimate
Include filters:
Goal: Brand awareness Product launch Always on Promotion Event
Channels: TV Streaming Social
Complexity: Simple Professional
Template card actions:
Preview Use template

CAMPAIGN WORKSPACE (MAIN SCREEN)
This is the most important screen.
Layout should be a 3 panel professional workspace:
LEFT PANEL: Campaign structure tree:
Campaign Media streams Placements Creatives
Allow expand/collapse.
Add buttons:
Add stream Add placement Add creative
CENTER PANEL: Main editing surface with tab navigation:
Tabs:
Overview Media Plan Creatives Budget Forecast Review
Default to Media Plan tab.
RIGHT PANEL:
Properties panel showing editable attributes of selected object.
Examples:
If campaign selected: Dates Budget Goal
If media stream selected: Channel Budget % Frequency
If placement selected: Format Targeting Dayparting

MEDIA PLAN TAB (TIMELINE VIEW)
Design a professional timeline planning interface.
Horizontal axis: Time (weeks)
Vertical axis: Media streams.
Example rows:
TV Broadcast Streaming Platform Social Video
Campaign bars should:
Be draggable Be resizable Allow splitting into flights
Include visual indicators:
Budget weight Frequency weight Creative assignments Inventory pressure indicator
Allow:
Drag creatives onto placements. Resize campaign duration. Adjust weighting with sliders.
Include:
Zoom timeline control. Week/month toggle. Snap to week toggle.

CREATIVES TAB
Asset library interface.
Grid + list toggle.
Creative cards show:
Thumbnail Duration Format Status Compatibility indicators
Include:
Upload button. Drag to placement functionality. Filter by:
Length Format Advertiser Approval status

BUDGET TAB
Visual budget allocation interface.
Show:
Total campaign budget.
Channel allocation:
TV Streaming Social
Use:
Adjustable sliders. Percentage display. Amount display.
Show:
Estimated reach updating live. CPM estimate. Frequency estimate.

FORECAST TAB
Dashboard style analytics view.
Show:
Reach curve graph. Frequency distribution graph. Budget burn chart. Channel contribution pie chart.
Include:
Scenario comparison:
Scenario A Scenario B
Allow duplicate scenario.

REVIEW TAB
Order summary before submission.
Show:
Campaign summary card.
Media plan summary table.
Creatives used.
Budget distribution.
Validation status:
Green checks for valid items. Warnings for missing creatives. Errors for conflicts.
Primary CTA:
Submit order.
Secondary CTA:
Save draft.

COPY CAMPAIGN FLOW
Campaign selection modal.
Search campaigns.
Show:
Campaign name Dates Budget Channels
After selection show copy options:
Checkbox list:
Structure Budget Channel mix Creatives Placements Dates Frequency rules

COMPONENTS TO DESIGN:
Campaign cards. Template cards. Timeline bars. Media stream rows. Creative cards. Budget sliders. Property panels. Expandable sections. Validation badges. Status chips.

INTERACTION BEHAVIOR:
Selecting object updates property panel.
Dragging creative highlights compatible placements.
Invalid actions show inline errors.
Budget changes update forecast.
Timeline resizing updates duration fields.
Autosave indicator.
Undo support.

VISUAL DESIGN SYSTEM:
8px grid.
Font: Inter or similar.
Text sizes:
12 metadata 14 body 16 important text 20 section titles 24 screen titles
Colors:
Neutral greys for structure.
Blue for interaction.
Green for valid.
Orange for warning.
Red for errors.
Use subtle borders instead of heavy shadows.

DATA REALISM:
Use realistic example data:
Campaign: Summer Car Launch 2026
Budget: 2,500,000 NOK
Channels:
TV Broadcast: 40%
Streaming: 45%
Social: 15%
Creatives:
Brand film 30s Product film 15s Bumper 6s

ADVANCED UX DETAILS:
Progress indicator for campaign completeness.
Inventory pressure heat indicators.
Reach estimates visible in context.
Inline editing where possible.
Hover states showing extra data.
Context menus on objects.

DELIVER:
Full desktop interface screens.
Focus on:
Campaign workspace. Media timeline. Template selection. Budget allocation.
Design realistic enterprise density.
Avoid excessive whitespace.
Make this look like a real production SaaS tool.
