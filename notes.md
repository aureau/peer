folders
    - if a folder reaches the memory cap, fallback would be to zip the folder and send it as a zipped file (best alternative)
ip tracking
    - verify session ids with a certain method, only that ip can access the website so other people cant try to exploit the database or get into the site
    this makes it to where we dont necess. have to add so many security features since we're working with personal and work sensitive data
simple sec measures
    - right now the api calls shows the key in the header for status, fix that
    ex. http://localhost:3000/api/<key>/status
api
    - status might be polling way too much

- adding a end session

- wrap my head around polling and seq more

RecievedItemCard is just terrible, edit that later
    - also maybe adding a preview if it spills over x amount of text, and hovering over briefly shows the texts
    - also more implementation around recieved list, when folders are uploaded the files should be nested under the folder, download as a folder, and able to expand to see all files in a SMALLER view (so seperate list/card styles)
    - if its large enough it implements a scrollable thing on the card, still dont like it - reiterate to something better

- where is the recieved items going after flipped session? when flipped back are we still keeping them? are they still in cloudflare?