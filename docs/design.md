DoseOn  
Software Design Specification  
SDS

DoseOn is a mobile application designed to help individuals manage their own medication intake through scheduled reminders and dose tracking.

The primary user of the application is the Care Recipient — the person who takes medications and actively tracks their medication taken.

In addition, Care Recipients are able to invite one or more care takers to support/remind them. care takers do not manage medications or schedules directly, but may receive notifications and reminders to assist the Care Recipient when needed. They also are able to see Care Recipient’s medication taken result and schedule.

**Document’s Purpose**

This document describes the functional and non-functional specifications of the DoseOn mobile application and admin website.

It is used as a document  for product, design, mobile development, backend development, and testing teams.

1. # General Description

   1. ## Technologies

The DoseOn system is developed using the following technologies:

- Mobile Application: React Native  
- Server / API: NodeJS hosted on AWS cloud services  
- Database: MySQL  
- Admin Webpage / Management System: Next.js, NodeJS

The system is fully cloud-based. No on-premises hardware or infrastructure is required.

2. ## Mobile OS and Platforms

The mobile application supports the following platforms:

- Android:  
  * Minimum supported Android OS version complies with Google Play Store requirements at the time of release.

  * The application supports devices with 16KB page size memory architecture.

- iOS  
  * Minimum supported iOS version complies with Apple App Store requirements at the time of release.

The supported OS versions may be updated over time in accordance with platform vendor policies.

3. ## Screen Resolutions

- The mobile application supports standard iPhone and Android screen resolutions.  
- The management system is designed for desktop use only.  
- The mobile application operates in Portrait mode only.  
- Landscape mode is not supported.

  4. ## GUI Language

The application supports multi-language user interfaces with both LTR and RTL layouts.

- Supported Languages:  
  * Hebrew (RTL)  
  * English (LTR)

- Language Behavior  
  * All strings should be put in a separate file for each language.  
  * On first time app is opened:  
  * If the device system language is Hebrew, the application UI is displayed in Hebrew (RTL).  
  * Otherwise, the application default language should be English (LTR).  
  * Users may change the application language manually in the Settings screen.  
  * Changing the language should make updates:  
  * display text  
  * Layout direction (LTR / RTL)

The application supports adding additional languages in future by adding string files without changing application structure.

5. ## User context

There are two contexts in which a user can make action. Both of them are available in normal accounts.  The main focus is Care Recipient. With care taker context, this is optional.

1. ### Care Recipient

The Care Recipient is the main context of the user. That is, they take medications and manage their own medication intake.

**Capabilities**

- Create and manage medications.  
- Define medication schedules and dosage times.  
- Receive medication reminders.  
- Log medication intake.  
- View medication history and statistics.  
- Invite and manage care takers.

**Responsibilities**

- Ensure medication schedules are accurate.  
- Log medication intake consistently.

  2. ### Care taker

The care taker is a secondary, supportive user invited by another Care Recipient. That is, they assist the Care Recipient by providing reminders and monitoring if the care recipient takes medicine on time, appointment with doctors, and remaining medicine.

**Capabilities**

- Receive notifications related to the Care Recipient’s medication intake (e.g. on time, missed doses).  
- View the Care Recipient’s medication schedules.  
- View medication intake records and adherence status.  
- View appointment with doctors and remaining medicine.

**Limitations**

- Cannot create, edit, or delete medications.  
- Cannot modify medication schedules or intake records.  
- Has read-only access to medication data.

Care takers solely support and remind the Care Recipient and do not replace the Care Recipient’s responsibility for medication management.

2. # Mobile App Description

   1. ## Splash Screen

The Splash Screen is displayed when the application is launched. It shows the DoseOn logo and application name while the application is initializing.

The screen is displayed for a fixed duration of 2 seconds and does not allow any user interaction. After initialization is completed:

- If the user is not logged in, the application navigates to the Boarding Screens (Request Verification Code Screen).  
- If the user is logged in, the application navigates to the Main Screens (Home Screen).


  2. ## Boarding Screens

The Boarding Screens are used for user authentication and account creation. These screens allow users to:

- Log in using mobile phone number verification.  
- Register a new account (for new users).  
- Read the Terms and Conditions and Privacy Policy (required for new users).

The boarding flow is shown only to unauthenticated users. Authenticated users bypass this flow and are navigated directly to the main screens.

1. ### Request Verification Code Screen

This screen allows the user to select the country code, enter their mobile phone number in order to request a verification code for authentication. After submitting, a verification code is sent to the provided phone number via SMS. The application then navigates to the Verification Screen.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| App logo / title | Text / Image | Yes |  |
| Country code | Dropdown | Yes |  |
| Phone number | Input text | Yes | Numeric input only |
| Send button | Button | Yes | Enabled only when a valid phone number is entered. |
| Error message | Text |  | Displayed only when validation or request fails. |

2. ### Verification Screen

This screen allows the user to enter the verification code received via SMS to authenticate their phone number. The verification code has 4 digits, entered through separate input fields. As the user enters each digit, the cursor moves to next input field automatically

After the verification code is validated successfully: 

- If the phone number already exists, the user is automatically logged in and navigated to the Main Screens (Home Screen).  
- If the phone number does not exist, the user is navigated to the Registration Screen.

The screen also provides an option to resend the verification code, which becomes available only after 60 seconds.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| App logo / title | Text / Image | Yes |  |
| Verification | Input text | Yes | 4 text fields, numeric only. |
| Send button | Button | Yes | Enabled only when a user enters 4 numbers of verification codes. |
| Resend code button | Button |  | After 60 seconds, this button will be enabled. Click on it will request to resend code to the user.  |
| Error message | Text |  | Displayed only when validation or request fails. |

3. ### Registration Screen

This screen is displayed only for new users. The user is required to provide a username to complete the registration. Additional information is optional and can be skipped. 

When users submit the information, Term & Conditional Policy pop up. This pop up will have two buttons, pressing the approve button will send registration data for registration.

After successful registration, the user is logged in and navigated to the **Main Screens (Home Screen)**.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| App logo / title | Text / Image | Yes |  |
| Username | Input text | Yes | Username should be at least 8 letters. |
| Year of birth | Dropdown | Optional | Show only year. |
| Reason for using application | Input text | Optional |  |
| Submit button | Button | Yes | Only enabled when user input username |
| Error message | Text |  | Displayed only when validation or request fails. |

**Term & Conditional Policy pop up**

This popup is displayed when the user submits the registration form.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Title | Text | Yes | Text: Terms and Conditions  |
| Content | Text | Yes | It will be a web page / pdf display. Ability to scroll. |
| Approve button | Button | Yes | Click will close pop up and send registration data |
| Decline button | Button | Yes | Click will close pop up and show Toast box: “You need to approve Terms and Conditions to continue the registration” |

3. ## Main navigation

Main navigation of  the application is a bottom tab navigation. It is visible in most of screens of app (except screens of boarding flow)

This will only show when the user logs in or completes the registration. This main navigation includes three tabs:

- Home  
- Medications  
- Care

If the user switches between tabs, the active tab will be focused to let the user know where he is in.

Another part of Main navigation is a header. This header will include user name, back button (if user is not in screens of bottom tab navigation), menu button.

1. ### Bottom tab navigation

This will appear in most of the screens after user log in or complete registration. There should be a special style in current/active tab

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Home | Tab | Yes | Will include an icon and name “Home”.  Click on it will navigate to Home section (2.4.1) |
| Medications | Tab | Yes | Will include an icon and name “Medications”. Click on it will navigate to Medications section (2.4.2) |
| Care | Tab | Yes | Will include an icon and name “Care”. Click on it will navigate to Care section (2.4.3) |

2. ### Header

This header will appear in all screens after user log in / complete registration. If the current screen is the first screen of the Home / Medication / Care section, there will be no back button. With other screens, there should be a back button.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Screen name | Text |  |  |
| Back button | Button |  | Visible only if the current screen is not the first screen of the Home / Medication / Care section. Click will go back to previous screen |
| Menu button | Button |  | Click on it to show the side menu. (2.3.3) |

3. ### Side menu

This menu can be shown by clicking on the menu button of the header.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| User name | Text |  |  |
| Profile | Button |  | Click on it will navigate to Profile screen (2.5.1) |
| My care taker | Button |  | Click on it will navigate to My care taker screen (2.5.2) |
| Statistic | Button |  | Click on it will navigate to Statistic screen (2.5.3) |
| Setting | Button |  | Click on it will navigate to Setting screen (2.5.4) |
| App Name & version | text |  | At the button of the menu, will show app name and version code, version name of application. For example: DoseOn 1.1.2 |

### 

4. ## Main Screens

   1. ### Home

The Home section provides an overview of the user’s upcoming medication reminders and recent medication intake statistics. This is also has warning message if user is late in taking medication

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| **Warning message** | Text |  | When use has one or more missed medicine intake, this text will be displayed. This could be: “You have missed a medication intake”The text should be visually emphasized (e.g. larger font size and highlighted color such as red). |
| Show missed medication list | Button |  | The text is “Show details” Click this button, list of missing medication intake will be displayed, could be expanse or popup. Each missed medication will include: Medicine name Image of medication Dosage Missed time in minutes |
| **Upcoming Medication taking** | Text |  | Label of upcoming medication taking section |
| List of medication | List |  | This is the list of next medication intake. Each row will include: Medicine name Image of medication Time of next taken Dosage Medication Group name |
| **Statistics** | Text |  | Label of Statistic section |
| Time | Text |  | Label of time range filter |
| Time range | Text / Clickable |  | If the user hasn't chosen a time range, it will show “All”. Click on it, and it will show the date range selector. Users can choose the date from \- date to. The statistic will be shown for this range |
| Statistic content | Text |  | This will include: “Total schedule doses”: number “On time taken”: number “Late taken”: number “Missed taken”: number  |

2. ### Medications

The Medications section allows users to manage their personal medication list according to user-defined groups that are created by them. If medication hasn’t had its group, it will be in “ungrouped” group

Users can select a group to view its medications, and select a medication to view detailed information in Medication Details screen (2.4.2.2) 

During the medication creating flow (2.4.2.3), users are able to assign the medication to an existing group or create a new group. (2.4.2.4)

This section focuses solely on managing the user’s own medications and does not include care taker functionality, which is handled separately in the Care section. (2.4.3)

1. #### Medications list screen

This screen displays the list of the user’s medications organized by user-defined medication groups. The group order will be sorted by the group name.

Medication groups are displayed as expandable/collapse items. When a group is expanded, the list of medications of that group is shown. Medications that are not assigned to any group are in “ungrouped” group. The list of medications is sorted by the time of the next dose. 

Users can expand or collapse groups, select a medication to view its details, or add a new medication.

The user is also able to search for the group name / medication name in the search box at the top of screen.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Search box | Input text |  | Searching for group name and medication name. After 1 second without inputting more characters, start searching. |
| Group lists | List |  | This is a list of group names. This will be sorted by name.  The item of this list is an expansion / collapse item.  |
| Group item \-\> collapse state | View |  | Group items will include: group name, group notes and number of medicines. |
| Group item \-\> expanse state | View |  | Like collapse items but below there will be a list of medicine of this group. Each medicine will include information:  Name Status Amount of each taken Time of missed dose or next dose (due to status) Click on each medicine will navigate to details screen (2.4.2.2) Add the end of this list (even if it is an empty list), there should be a button “Add medicine”. Click on it will go to Add  Medication screen (2.4.2.3) |
| Edit group | Button |  | In each group item, there will be an edit icon. Clicking on it will go to edit group screen (2.4.2.4) |
| Add medicine | Button |  | This is a floating button, it should be placed above all components in this screen. Maybe at the bottom right of the screen. Click on it will go to add medicine screen (2.4.2.3) This button appears even if there is a group, medicine or not. |
| No group, medicine state | Text |  | If there is no medicine and no group,  there should be an empty state message: “No medications yet. Add your first medication to get started.” |

##### **Medicine Status:** {#medicine-status:}

- Upcoming: between the time of: after the user took medicine 30 mins and before next took 30 mins and the user took the previous dose.  
- Due: Within 30 minutes before the scheduled dose time and the user took the previous dose.  
- Taken: from the time user takes the medicine to 30 mins after scheduled dose time  
- Missed: from the scheduled dose time and user still haven’t take the medicine  
- Completed: user completes his/her medicine taken period and no longer requires reminders or intake tracking.

  2. #### Medication Details screen

This screen displays the detailed information of selected medication and related information. They are: 

- Medication name  
- Medication status  
- Time of next taking  
- Frequency  
- Start date  
- End date  
- The available medicine  
- Group name (if has)  
- Notes  
- Taking history

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Medicine name | Text |  |  |
| Medicine status | Text |  |  |
| Medicine image | Image |  | The image of medicine or medicine box. Click on this image will expanse fullscreen, able to zoom in/out |
| Time of next taking | Text |  | It should be exact time and count down time |
| Dosage | Text |  | This should show the amount \+ medicine type. For example: 2 pills |
| Frequency |  |  | This is how often the medicine is taken. The details list of frequency list will be listed in add/edit medication screen (2.4.2.3) |
| Start date | Text |  | The start date of taking this medicine |
| End date | Text |  | The finish date for this medicine |
| The available medicine | Number |  | This is the amount of medicine that you have. |
| Group name | Text |  | The group name that this medicine is assigned to. If not, it will be “ungrouped” |
| Notes | Text |  | Notice when taking medicine, for example: use this after a meal, not use after 10 pm… |
| Taking history | List |  | Click on this will show list of time & status (on time / late / missed) that user took this medicine |
| Edit button | Button |  | Click it will navigate to edit medicine screen (2.4.2.3) |
| Delete button | Button |  | Click it will show a confirmation pop up with text: “Are you to delete this medicine? Please make sure before doing this action.”If the user chooses “Yes, sure”, they will delete this medicine. If the user chooses “No”, just close the pop up. |

  3. #### Add/edit Medication screen

This screen is for adding or editting a medication. 

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Screen name | Text |  | If it is add med, the text is “Add medicine reminder” If it is edit med, the text is “Edit medicine reminder” |
| Medicine name | Textfield | Yes |  |
| Medicine image | Image |  | The image of medicine or medicine box. Click on this image to pop up to choose an image from the camera or gallery. It is possible to crop an image, the image should be square. |
| Dosage | Dropdown & Textfield | Yes | There should be a dropdown for medicine type and textfield for amount of usage. Medicine type will be: Pill / Liquid / Injection / Other Choose medicine type: Pill \-\> text field will “\_\_\_ pill(s)” Liquid \-\> text field will “\_\_\_ ml” Injection \-\> text field will “\_\_\_dose(s)” Other \-\> text field will “\_\_\_” |
| Frequency | Dropdown | Yes | This is how often the medicine is taken. |
| Start date | Datetime popup | No | The start date of taking this medicine. Default is the daytime of adding medication |
| Duration | Textfield | No | The duration of taking this medicine. This will be used for calculating the end date in Medication Details Screen (2.4.2.2) |
| Amount of medicine | Number | No | This is the amount of medicine that you have. |
| Group name | Dropdown | No | The group name that this medicine is assigned to. If not, it will be “ungrouped” In the final of the list, there will be “Create new group”, clicking on this will go to add/edit group screen (2.4.2.4) |
| Notes | TextField | No | Notice when taking medicine, for example: use this after a meal, not use after 10 pm… |
| Save button | Button |  | This will only enable when mandatory information is input. Clicking on it will add medication and go back to the previous screen. The previous screen should reload to display new data. If requesting add / edit medication fails, should show an error message and stay there.  |
| Cancel button | Button |  | Click on it, this will go back to the previous screen. |
| Error message | Text |  | Show like pop up |

##### **Frequency display flow:**

#### This defines how to display the medication taking schedule based on the selected frequency type. 

When the user selects a frequency option, the component below will change dynamically to display relevant configuration items. The frequency option will include:

- **Daily:**

  When Daily is selected:

* A control to define the **number of times per day** is displayed. For example: \_\_\_\_ time(s) a day  
* The value can be increased or decreased using **plus (+) and minus (–) buttons**.

  Based on the selected number of times per day:

* A corresponding list of intake time entries is displayed below.  
* Each entry represents one intake time and includes:  
  * An order index (for example: \#1, \#2….).  
  * A selectable time field.  
* Each entry can be edited independently.


- **Specific days:**

  When **Specific Days** is selected:

* A **Choose Date** button is displayed.  
* When tapped, a **date and time picker popup** is shown.

  After the user selects a date and time and confirms:

* The selected date and time are added to a list displayed below the button.  
* Each entry includes:  
  * An order index.  
  * The selected date and time.

  Users may add multiple entries:

* The same date may be selected multiple times as long as the time values are different.  
* The list of selected date-time entries is automatically sorted from the nearest upcoming time to the farthest.


- **Every X days:**

  When **Every X Days** is selected:

* A control labeled **Every \_\_\_ days** is displayed.  
* The value of X can be adjusted using **plus (+) and minus (–) buttons**.

  Below this control:

* A **number of times per day** selector is displayed. For example: \_\_\_\_ time(s) a day  
* Based on the selected number:  
  * A corresponding list of intake time entries is shown.  
  * Each entry includes an order index and a selectable time field.

    

- **Every X weeks:**

  When **Every X Weeks** is selected:

* A control labeled **Every \_\_\_ weeks** is displayed.  
* The value of X can be adjusted using **plus (+) and minus (–) buttons**.

  Below this control:

* A list of **days of the week** (Monday … Sunday) is displayed.  
* The user may select one or multiple days.

  After selecting days:

* A **number of times per day** selector is displayed. For example: \_\_\_\_ time(s) a day  
* Based on the selected number:  
  * A list of intake time entries is shown for each selected day.  
  * Each time entry includes an order index and a selectable time field.

    

- **Every X months:**

  When Every X Months is selected:

* A control labeled Every \_\_\_ months is displayed.  
* The value of X can be adjusted using plus (+) and minus (–) buttons.

  Below this control:

* A list of days of the month (01–31) is displayed.  
* The user may select one or multiple days.

  After selecting days:

* A number of times per day selector is displayed. For example: \_\_\_\_ time(s) a day  
* Based on the selected number:  
  * A list of intake time entries is shown.  
  * Each entry includes an order index and a selectable time field.

    

- **Use When Necessary:**

  When **Use When Necessary** is selected:

* No reminder or scheduled intake is created.  
* The medication does not trigger notifications.

  A descriptive text is displayed to explain that:

* The user should manually log the medication intake when it is taken.  
* The system will only track intake history without reminders.

  4. #### Add/edit group screen

This screen is used for creating a new medication group or editing an existing one. Medication groups are used only for organizing medications and do not affect schedules or reminders.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Group name | Textfield | Yes |  |
| Group note | Textfield | No |  |
| Save button | Button |  | This button is only enabled when the group name is filled. Click on this, will create / edit the group, go back to the previous screen. |
| Cancel button | Button |  | Click on this, and go to the previous screen. |
| Error message | Popup |  | Show when getting error from apis. |

##### 

3. ### Care

The care section is for users doing in the care taker role. This allows users to manage and monitor the Care Recipients that they support about medication taking. With this role, user is able to:

- Review and respond to the request from the care recipient to become his/her supporter.  
- View recent medication reminders and alerts.  
- Every time the care recipient forgets to take medicine, with a supporter role, the user will receive notification / alerts about this and do the reminder face to face.  
- Read the medication taken list of the care recipient and his/her taken history.  
- Remove a care recipient from their care list

All of the information from the care recipient is read-only with care takers. But the caretaker can create / edit friendly names of care recipients to remember easily.

1. #### Care Overview screen

When the user switches bottom navigation to care tab, the Care Overview Screen will be displayed. This screen has 3 main sections which are:

- Pending Requests: This will show the list of requests to become a care taker from another user.  
- Recent Medication Reminders: this will include recent medication reminder / alerts from users that are his/her care recipients.  
- My Care Recipients: this will show the list of his/her care recipients.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| **Pending Requests** | Text / Clickable |  | Text is: “Pending Requests” and amount of pending requests. Click on it will show / hide pending request list |
| Pending request list | list |  | This is a list of pending requests. Each row will include: Request owner name Time of creation Request message Accept button: click on it will approve the request. This row will be removed for this list. Two other sections will be reloaded to update new data from new care recipient Decline button: click on it will show confirmation pop up with text “Are you sure to decline this request?”. With two buttons: “Yes, sure”, “Cancel”.  |
| Pending request empty state | Text |  | If there is no pending request list, there will be message “Currently, you have no pending requests” |
| **Recent Medication Reminder** | Text / Clickable |  | Text is: “Medication Reminder” and amount of reminders. Click on it will show / hide medication reminder list |
| Medication Reminder list | List |  | This is a list of recent medication reminders. Each row will have: Care recipient name Time of taking medicine Medicine name and dosage  Medicine status. [See here](#medicine-status:) The list should be sorted according to care recipient name \- time of taking medicine (from the most recent) |
| Medication reminder empty state | Text |  | If there is no reminder, there will be message “There is no recent reminder this time” |
| **My care recipient** | Text / Clickable |  | Text is: “My care recipient” and amount of recipients. Click on it will show / hide the list |
| My care recipient list | List |  | This is a list of My care recipients. Each row will have: Care recipient name Notice message: if he/she has missed taking medicine, there will be a red message “Missing of taking medicine. Please remind he/she” Remove button: click on it will show confirmation pop up with text: “Are you sure that you want to remove this care recipient from your list?”. With two buttons: “Yes, sure”, “Cancel” Click on the row will open Care Recipient details screen (2.4.3.2) |
| My care recipient empty state | Text |  | If there is no care recipient, there will be message “You don’t have care recipient this time” |

  2. #### Care Recipient details screen.

This displays all information about the care recipient. The care taker can add / edit the friendly name and make a phone call to the care recipient. This screen will include:

- General Information: name or friendly name, date of adding  
- Medications: list of medication of care recipient, their dosage, start \- end date, frequency of taking  
- Next reminder / Alerts: list of next reminder of medicine taken. If there are missing taking alerts, these are in this list too  
- Statistics: overall summary of medication taken activities. They are: total schedule doses, in there how many on time taken, late taken, missed taken. There is also a filter for users to choose the range of time.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| **Care recipient name or friendly name** | Text / Clickable |  | This is the user name of the care recipient if the user hasn’t added a friendly name. Clicking this will switch the text to textfield and appear with two buttons (or icon button), save and cancel. Clicking the save button will add a friendly name (if haven’t created) or change friendly (if already created). Cancel button is just change textfield to text, hide two buttons (save and cancel) |
| Date of adding | Text |  | Showing the date time that the caretaker adds this user to care recipient lists.  |
| **Medications** | Text |  | Label of Medication section |
| List of medications | List |  | This is a list of care recipient’s medication. Each row will include: Medication name Dosage Frequency of taking Start \- end date Click on this row and go to the Medication Details screen. (2.4.2.2) |
| **Next reminders** | Text |  | Label of next reminders section |
| List of reminders | List |  | This is the list of next reminders. If there is a recent missed / late or taken, this reminder should be placed here. It could be focused for seeing it easily Each row will include: Time of taken Medicine name Medicine status Call button: click on this button and open the system call application with a care recipient phone number.  |
| **Statistics** | Text |  | Label of Statistic section |
| Time | Text |  | Label of time range filter |
| Time range | Text / Clickable |  | If the user hasn't chosen a time range, it will show “All”. Click on it, and it will show the date range selector. Users can choose the date from \- date to. The statistic will be shown for this range |
| Statistic content | Text |  | This will include: “Total schedule doses”: number “On time taken”: number “Late taken”: number “Missed taken”: number  |
| Remove button | Button |  | Click on it will show confirmation pop up with text: “Are you sure that you want to remove this care recipient from your list?”. With two buttons: “Yes, sure”, “Cancel” |

  5. ## Others

     1. ### Profile Screen

This screen will display user general information. It is the username, reason for using this application, year of birth, phone number.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Username | Text |  |  |
| Reason for using this application | Text |  |  |
| Year of birth | Text |  |  |
| Phone number | Text |  |  |
| Edit button \- Save button | Button |  | Click on this and will switch Username, Reason for using application, Year of birth to editable (textfield). The Edit button text will change from “Edit” to “Save”. This changes to Edit mode. Click on the “Save” button will save new information and switch textfield to text (uneditable). The text will change from “Save” to “Edit”. This changes to View mode |
| Cancel button | Button |  | This button is only displayed when the screen is in Edit mode. Click on it and the screen will change to View mode. |

2. ### My Care Takers

This screen will show a list of user’s care suppoters. Click on each supporter will display a pop up with supporter information with a phone button, connection status.

**The connection status will include:**

- Requested: the request is sent to the supporter but he/she hasn’t responded to it.  
- Accepted: the supporter accepts the request.  
- Declined: the supporter declines the request.  
- Removed: the user removed the supporter from his supporter list.

Users are also able to add a caretaker from this screen. 

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Supporter list | List |  | Each item of this list will include: Supporter name / friendly name (the name is defined by user for remembering easily) Connection Status Edit button: click will show add/edit supporter popup. See below description Remove button: will show confirmation pop up with text “Are you sure to remove this supporter?”. Two buttons: “Yes, sure” and “Cancel” Click on row (except remove / edit button) will show care taker detail pop up. See below description. 	 |
| Add a supporter  | Button |  | Click on it will show an add/edit supporter popup. See below description |
| Empty state | Text |  | When there is no supporter in the list, there will be the text “You have no care taker currently. Press add button to send request to a care taker” |

##### **Add / Edit caretaker popup**

This popup will show when the user clicks on add a supporter button or edit a supporter.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Pop up title | Text |  | If add supporter, text will be “Add a supporter” If edit, text will be “Edit the supporter” |
| Friendly name | Textfield |  | This will be user defined name for him/her remembering easily |
| Supporter phone | Textfield or text |  | If add supporter, this is editable (textfield) If edit, this is only text (uneditable) |
| Message | Textfield |  | If add a supporter, this is editable. If edit, this is uneditable |
| Submit button | Button |  | If add supporter, text will be “Send request” If edit, text will be “Save” Click will send a request / save and close pop up. |
| Close button | Button |  | Click will close pop up |

##### **Care taker details popup**

This popup will show when the user clicks on each row of care taker list. This will show details of user care taker details

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Pop up title | Text |  | Text will be “Care taker details” |
| Friendly name | Text |  | This will be user defined name for him/her remembering easily |
| Supporter phone | Text |  |  |
| Connection Status | Text |  |  |
| Phone button | Button |  | Click on it will open system phone application of phone with prefill supporter’s phone |
| Close button | Button |  | Click on it will close pop up |

3. ### Statistic Screen

This screen is for displaying the overall statistic of medication taken activities of the user. This should be simple, clear and something is that easy to understand. They are: total schedule doses, in there how many on time taken, late taken, missed taken. There is also a filter for users to choose the range of time.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Statistics | Text |  | Label of Statistic |
| Time | Text |  | Label of time range filter |
| Time range | Text / Clickable |  | If the user hasn't chosen a time range, it will show “All”. Click on it, and it will show the date range selector. Users can choose the date from \- date to. The statistic will be shown for this range |
| Statistic content | Text |  | This will include: “Total schedule doses”: number “On time taken”: number “Late taken”: number “Missed taken”: number  |

4. ### Settings Screen

This screen includes all settings of application which is notification settings, language settings, app version, terms and conditions, logout

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Notification | Text |  | Label of Notification section |
| Alert sound | Button |  | Click will show a list of alert sounds (popup). Each item will have: Sound name Play button. Click on this and play sound Click on item (or name) will choose this sound as an alert sound for notification of taking medicine. |
| Sound volume | Label and volume bar |  | Label: “Sound volume” and there is a horizon volume bar. Users can click or drag to increase/descrease volume of sound. |
| Test sound | Button |  | Click on it will play selected alert sound with chosen volume. |
| Repeat time | Label and textfield |  | Label: “Repeat time” Description text: “This defined how many minutes that the alert will be repeated when you missed the medicine taking” Textfield: user input the number of minutes that he/she wants to repeat the alerts. |
| Language | Text |  | Label of Language setting |
| Select language | Button |  | Text should be the current language of application. Click on it will show a list of available languages of application. Choosing a language will change the language of application. |
| Terms and conditions | Label |  | Text is “Terms and Conditions” There is a “Details” button. Click on it, show Term and Conditions details. It could be a pdf / webpage. |
| App version | Text |  | It is App name \+ version name \+ version code. For example: DoseOn 1.1.2 |
| Logout | Button |  | Click on it, show a confirmation popup with text: “Are you sure to logout?” with two buttons “Yes, sure” and “Cancel: Click yes, will log out and go to the Request Verification Code Screen. Click no, just close the pop up |

5. ### Alarm Screen

When the time of medication taking occurs, the alert will do action like an alarm application (depends on system permission). The alarm screen will be displayed if it is allowed by the OS. This screen will play the selected alert sound with selected volume in the settings screen.

| Parameter Name | Type | Mandatory | Comments |
| :---- | :---- | :---- | :---- |
| Message | Text |  | “It’s time to take your medicine” \-\> replace this with the name of medication. If  there are more than one, it should show like a list. |
| Confirm button | Button |  | Text: “I took it”. Click on it will close the alarm screen, stop alert sound and update the medication status. |
| Repeat | Button |  | Text of this button is “Snooze” Click on and will close the alarm screen, stop alert sound and create another alarm in selected repeat time. Don’t update the medication status. |
| Skip | Button |  | If the user clicks it, show a message "Are you sure you want to skip this medication taking?" Confirmation will skip this alarm and send notification about this action to the care takers. This button should be smaller (is harder to click) than other buttons |

3. # Notifications & Reminders

This section defines the behavior of notifications in the system. It describes when notifications are triggered, who receives them. There are three notification types in the application.

**Medication Reminder:**  alerts the Care Recipient to take medication at scheduled times.  
**Care Taker Alert**: notifies the Care Taker when the Care Recipient has not confirmed medication intake within a defined time window.  
**System Notification:** notifies some actions related to activities of the care recipient and the care taker.

1. ## Medication Reminder

This reminder should do action like an alarm or clock application depending on the operating system’s permission. 

- At the scheduled medication time, the system sends an alert notification to the Care Recipient.  
- If the Care Recipient does not confirm medication intake. The alert may repeat based on the configured repeat interval.  
- When the Care Recipient confirms medication intake:  
* The system records the intake.  
* All reminders related to that dose are immediately stopped.

  2. ## Care Taker Alert

This alert is like a push notification. Five minutes after the scheduled medication time: 

- If no intake is recorded, a notification is immediately sent to the assigned Care Taker.  
- If the Care Recipient confirms medication intake, a notification is sent to the Care Taker indicating that the medication has been taken.


  3. ## System Notification:

System notifications are push notifications generated by events related to the care relationship between users. These notifications will appear in the following situations:

- Care Recipient sends a care request, notification is sent to the invited Care Taker.  
- Care Taker responds to a care request (Accept / Decline), notification is sent to the Care Recipient.  
- Care Recipient removes a Care Taker from the care list, notification is sent to the affected Care Taker.  
- Care Taker leaves or removes themselves from a care relationship, notification is sent to the Care Recipient.  
- Care Recipient confirms medication intake, notification is sent to the Care Taker.
