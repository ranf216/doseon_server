# Backend / Api Description

##### **Some data schema:**

- **User**: represents a registered user. A user can act as a Care Recipient or a Care Taker or both.  
* user\_id  
* phone\_num  
* username  
* year\_of\_birth  
* reason\_for\_using  
* created\_at  
* updated\_at  
- **Medication type:** Represents the physical form of a medication.  
* medication\_type\_id  
* medication\_type\_name  
* dosage\_unit  
* created\_at  
- **Medication**: represents a medication defined by the user  
* medication\_id  
* user\_id  
* medication\_name  
* medication\_type\_id  
* medication\_type\_name  
* dosage  
* start\_date  
* end\_date  
* initial\_amount  
* remaining\_amount  
* group\_id  
* group\_name  
* notes  
* image\_url  
* created\_at  
- **Medication Group**: user-defined grouping used only for organizing medications. Maybe, an ungrouped list can be defined like this object but with a special name or id  
* group\_id  
* user\_id  
* group\_name  
* group\_note  
* created\_at

  1. ## User

     1. ### User/send\_sms\_code

- Send verification code to user phone  
- Request:   
* \#request,   
* phone\_num,   
* country\_code \- optional  
- Response:   
* rc  
* message

  2. ### User/resend\_sms\_code

- Resend verification code to user phone  
- Request:   
* \#request  
* phone\_num  
* country\_code \- optional  
- Response:   
* rc  
* message

  3. ### User/verify\_sms\_code

- Verifying the code that send to user phone  
- Request:   
* \#request  
* phone\_num  
* verification\_code  
* country\_code \- optional  
- Response:   
* rc  
* message  
* is\_registered

  4. ### User/login\_with\_phone

- Logging in with a phone number through authentication key  
- Request:   
* \#request  
* auth\_key  
* device\_id \- optional  
* os\_type \- optional  
* os\_version \- optional  
* device\_model \- optional  
* app\_version \- optional  
* language \- optional  
- Response:   
* rc  
* message  
* token  
* username

  5. ### User/register\_with\_phone

- Registering new user with a phone number through authentication key  
- Request:   
* \#request  
* auth\_key  
* user\_name  
* year\_of\_birth \- optional  
* reason\_of\_using \- optional  
* device\_id \- optional  
* os\_type \- optional  
* os\_version \- optional  
* device\_model \- optional  
* app\_version \- optional  
* language \- optional  
- Response:   
* rc  
* message  
* token

  6. ### User/get\_my\_profile

- Getting user information  
- Request:   
* \#request  
* \#token  
- Response:   
* rc  
* message  
* username  
* year\_of\_birth  
* reason\_of \_using, phone\_num

  7. ### User/update\_my\_profile

- Update the information of user account  
- Request:   
* \#request  
* \#token  
* username \- optional  
* year\_of\_birth \- optional  
* reason\_of\_using \- optional  
- Response:   
* rc  
* message

  8. ### User/update\_device\_info

- Updating device information which is using the application. This is mainly for registering device for FCM  
- Request:   
* \#request  
* \#token  
* Device\_id \- optional  
* os\_type \- optional  
* os\_version \- optional  
* device\_model \- optional  
* app\_version \- optional  
- Response:   
* rc  
* message

  9. ### User/logout

- Logging out, clear current token  
- Request:   
* \#request  
* \#token  
- Response:   
* rc  
* message

  2. ## Medicine

     1. ### Medicine/get\_home\_overview

- Get upcoming and missed medication intakes for Home screen.  
- Request:   
* \#request  
* \#token  
- Response:   
* rc  
* message  
* missed\_medications: array of missed medications. Each item will include:  
  * medication\_id  
  * medication\_name  
  * medication\_image  
  * medication\_group\_name  
  * schedule\_time  
  * dosage  
  * missed\_minute  
* upcoming\_medications: array of upcoming medications. Each item will include:  
  * medication\_id  
  * medication\_name  
  * medication\_image  
  * medication\_group\_name  
  * schedule\_time  
  * dosage  
- 

  2. ### Medicine/get\_medication\_list

- Get the list of user medications grouped by medication groups.  
- Request:   
* \#request  
* \#token  
- Response:   
* rc  
* message  
* group\_list: this is an array of groups. The medicine list will be placed in each group item. Each group item will include:  
  * group\_id  
  * group\_name  
  * group\_note  
  * medication\_count  
  * medications: this is an array of medications of this group. Each medication item will include:  
    * medication\_id  
    * medication\_name  
    * medication\_type  
    * dosage  
    * status  
    * next\_taken\_time  
    * remaining\_amount  
* Ungrouped\_medications: this is an array of medications of this group. Each medication item will include: like medication item above

  3. ### Medicine/get\_medication\_detail

- Get detailed information about a specific medication.  
- Request:   
* \#request  
* \#token  
* medication\_id  
- Response:   
* rc  
* message  
* medication\_detail:  
  * medication\_name  
  * medication\_type  
  * medication\_image  
  * dosage  
  * frequency  
  * start\_date  
  * end\_date  
  * remaining\_amount  
  * group\_id  
  * group\_name  
  * notes  
  * status  
  * next\_taken\_time  
* taken\_history: array of taken activities for current medicine. Each item will include:  
  * schedule\_time  
  * taken\_time  
  * status

    4. ### Medicine/add\_medication

- Add a new medication for the current user.  
- Request:   
* \#request  
* \#token  
* medication\_name  
* medication\_type  
* dosage  
* frequency  
* start\_date \- optional  
* duration \- optional  
* available\_amount \- optional  
* group\_id \- optional  
* notes \- optional  
* medication\_image \- optional  
- Response:   
* rc  
* message  
* medication\_id

  5. ### Medicine/update\_medication

- Update information of an existing medication.  
- Request:   
* \#request  
* \#token  
* medication\_id  
* medication\_name \- optional  
* medication\_type \- optional  
* dosage \- optional  
* frequency \- optional  
* start\_date \- optional  
* duration \- optional  
* available\_amount \- optional  
* group\_id \- optional  
* notes \- optional  
* medication\_image \- optional  
- Response:   
* rc  
* message

  6. ### Medicine/delete\_medication

- Delete a medication from the user’s medication list.  
- Request:   
* \#request  
* \#token  
* medication\_id  
- Response:  
* rc  
* message

  7. ### Medicine/confirm\_taken

- Confirm that the user has taken a medication dose.  
- Request:  
* \#request  
* \#token  
* medication\_id  
- Response:  
* rc  
* message  
* updated\_status

  8. ### Medicine/get\_taken\_history

- Get medication intake history.  
- Request:  
* \#request  
* \#token  
* medication\_id  
- Response:  
* rc  
* message  
* taken\_history: array of taken activities for current medicine. Each item will include:  
  * schedule\_time  
  * taken\_time  
  * status

    

  3. ## MedicineGroup

     1. ### MedicineGroup/get\_group\_list

- Get all medication groups created by the current user.  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* group: array of medication group. Each item will include:  
  * group\_id  
  * group\_name  
  * group\_note  
  * medication\_count  
  * Medications: list of medications of current group. Each item will include:  
    * medication\_id  
    * medication\_name  
    * status  
    * dosage  
    * next\_taken\_time

    2. ### MedicineGroup/add\_group

- Create a new medication group.  
- Request:  
* \#request  
* \#token  
* group\_name  
* group\_note \- optional  
- Response:  
* rc  
* message  
* group\_id


  3. ### MedicineGroup/update\_group

- Update the current medication group.  
- Request:  
* \#request  
* \#token  
* group\_id  
* group\_name \- optional  
* group\_note \- optional  
- Response:  
* rc  
* message

  4. ### MedicineGroup/delete\_group

- Delete the medication group.  
- Request:  
* \#request  
* \#token  
* group\_id  
- Response:  
* rc  
* message  
- Note: when a group is deleted, medications belonging to this group won’t be deleted, they are moved to Ungrouped.

  5. ### MedicineGroup/get\_group\_details

- Get detailed information about a medication group and its medications.  
- Request:  
* \#request  
* \#token  
* group\_id  
- Response:  
* rc  
* message  
* group\_id  
* group\_name  
* group\_note  
* medication\_count  
* medications: this is an array of medications of this group. Each medication item will include:  
  * medication\_id  
  * medication\_name  
  * medication\_type  
  * frequency  
  * dosage  
  * status  
  * next\_taken\_time  
  * remaining\_amount

  4. ## Care

The care request status will include value: 

- Requested:   
  - Value: 1  
  - Description: the request is sent to the caretaker but he/she hasn’t responded to it.  
- Accepted:   
  - Value: 2  
  - Description: The caretaker accepts the request.  
- Declined:   
  - Value: 3  
  - Description: the caretaker declines the request.  
- Removed:   
  - Value: 4  
  - Description: the user removed the caretaker from his/her supporter list.

    1. ### Care/send\_request

- Send a caretaker request to another user.  
- Request:  
* \#request  
* \#token  
* phone\_number  
* friendly\_name \- optional  
* message \- optional  
- Response:  
* rc  
* message  
* request\_id  
* request\_status

  2. ### Care/respond\_request

- Respond to a care request (accept or decline).  
- Request:  
* \#request  
* \#token  
* request\_id  
* action \- (2: accept / 3: decline)  
- Response:  
* rc  
* message  
* request\_id  
* request\_status

  3. ### Care/get\_pending\_requests

- Get the list of pending care requests for the current user (as Care Taker).  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* Pending\_requests: list of pending requests. Each row item will include:  
  * request\_id  
  * care\_recipient\_id  
  * care\_recipient\_name  
  * message  
  * phone\_number  
  * created\_at

    4. ### Care/get\_care\_recipients

- Get the list of care recipients that the current user is taking care of.  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* care\_recipients: list of care recipients. Each row item will include:  
  * care\_recipient\_id  
  * friendly\_name  
  * phone\_number  
  * status

    5. ### Care/get\_care\_recipient\_detail

- Get detailed information about a care recipient.  
- Request:  
* \#request  
* \#token  
* care\_recipient\_id  
- Response:  
* rc  
* message  
* friendly\_name  
* phone\_number  
* adding\_date  
* medications: this is an array of medications of this care recipient. Each medication item will include:  
  * medication\_id  
  * medication\_name  
  * frequency  
  * dosage  
  * start\_date  
  * end\_date  
* recent\_reminders: this is an array of reminders for this care recipient. Each tiem will include:  
  * medication\_id  
  * medication\_name  
  * schedule\_time  
  * taken\_time  
  * status  
* statistic:  
  * total\_scheduled\_passed  
  * on\_time\_taken  
  * lated\_taken  
  * missed\_taken

    6. ### Care/remove\_care\_recipient

- Remove a care recipient from the care list.  
- Request:  
* \#request  
* \#token  
* care\_recipient\_id  
- Response:  
* rc  
* message

  7. ### Care/get\_care\_takers

- Get the list of care takers assigned to the current user.  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* caretakers: an array of caretakers. Each item will include:  
  * care\_taker\_id  
  * friendly\_name  
  * phone\_number  
  * request\_status

    8. ### Care/update\_friendly\_name

- Update the friendly name of a care taker or care recipient.  
- Request:  
* \#request  
* \#token  
* friendly\_name  
* friendly\_name\_type (1: friendly name of a care taker, 2: of a care recipient)  
- Response:  
* rc  
* message

  9. ### Care/remove\_care\_taker

- Remove a care taker from the care list.  
- Request:  
* \#request  
* \#token  
* care\_taker\_id  
- Response:  
* rc  
* message

  5. ## Notification

     1. ### Notification/get\_recent\_notifications

- Get recent notifications for the current user.  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* notifications: array of recent notifications. Each row item will include:  
  * notification\_id  
  * care\_recipient\_id  
  * care\_recipient\_name  
  * medication\_name  
  * medication\_status  
  * dosage  
  * schedule\_time  
  * taken\_time

  6. ## Settings

     1. ### Settings/get\_settings

- Get settings of the current user  
- Request:  
* \#request  
* \#token  
- Response:  
* rc  
* message  
* notification\_sound\_id  
* notification\_sound\_name  
* notification\_sound\_volume  
* notification\_sound\_repeat\_time  
* language

  2. ### Settings/update\_settings

- Update settings of the current user.  
- Request:  
* \#request  
* \#token  
* notification\_sound\_id  
* notification\_sound\_volume  
* notification\_sound\_repeat\_time  
* language  
- Response:  
* rc  
* message  
* notification\_sound\_id  
* notification\_sound\_name  
* notification\_sound\_volume  
* notification\_sound\_repeat\_time  
* language

### 

  7. ## Statistic

     1. ### Statistic/get\_user\_statistics

- Get medication intake statistics of the current user.  
- Request:  
* \#request  
* \#token  
* From\_date \- optional  
* to\_date \- optional  
- Response:  
* rc  
* message  
* total\_scheduled\_passed  
* on\_time\_taken  
* lated\_taken  
* missed\_taken

  2. ### Statistic/get\_care\_recipient\_statistics

- Get medication intake statistics of the recipient user.  
- Request:  
* \#request  
* \#token  
* recipient\_id  
* From\_date \- optional  
* to\_date \- optional  
- Response:  
* rc  
* message  
* total\_scheduled\_passed  
* on\_time\_taken  
* lated\_taken  
* missed\_taken


  8. ## System

     1. ### System/get\_params

- Get system configuration parameters used by the mobile application.  
- Request:  
* \#request  
- Response:  
* rc  
* message  
* medication\_types: array of medication types. Each item will include:   
  * medication\_type\_id  
  * medication\_type\_name  
  * dosage\_unit  
  * created\_at  
* Alert\_sounds: array of alert sounds. Each item will include:  
  * notification\_sound\_id  
  * notification\_sound\_name  
  * notification\_sound\_url

# 
