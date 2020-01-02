#lang racket
(require net/rfc6455)
(require json)
(require web-server/http/bindings)
(require "public-defines.rkt"
         "closed-proc.rkt" 
         "message-proc.rkt"
         "draw-proc.rkt"
         "game-proc.rkt"
         "login.rkt"
         (only-in "account-proc.rkt" account-proc)
         "room-proc.rkt")

(require web-server/dispatchers/dispatch-files
         web-server/dispatchers/filesystem-map
         web-server/web-server
         web-server/dispatch)
(define (static-serve static-port file-path)
  (serve #:dispatch (make #:url->path (make-url->valid-path (make-url->path file-path))
                          #:path->mime-type (lambda (path) (cond 
                                                             ((string-suffix? (path->string path) ".mp3") (string->bytes/utf-8 "audio/mpeg"))
                                                             ((string-suffix? (path->string path) ".css") (string->bytes/utf-8 "text/css"))
                                                             (#t #f)))) 
         #:port static-port))
(define (broadcast-if-room-status-modify fun)
  (define (broadcast)
    (define rooms-namelist 
      (filter string?
              (hash-map name-status 
                        (lambda (key value) 
                          (if (equal? "rooms" (hash-ref value 'state '()))
                              key
                              '())))))
    (define (oneroomstatus key value)
      (make-hash (list (cons 'room key) 
                       (cons 'peoplenum (length (hash-ref value 'names)))	  
                       (cons 'roomstatus (hash-ref value 'gamestate)))))
    (define roomsstatus (hash-map  room-status oneroomstatus))
    ;(display rooms-namelist)
    (broadcast-json rooms-namelist "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus)) ))
  (obs-hash room-status fun broadcast))
(define (proc client params)
  (define name (extract-binding/single 'name params))
  (let/cc close
    (let loop ((private-status (list ))) 
      (let* ((rec (ws-recv client )) 
             (data (with-handlers ((exn:fail? (lambda(e) rec)))                                        
                     (begin (string->jsexpr rec)))) 
     
             (result (broadcast-if-room-status-modify
                      (thunk
                       ;(display rec)
                       (match data  
                         ((hash-table ('type "account")) (begin (account-proc  name  (hash-remove data 'type)) ))
                         ((hash-table ('type "game") ) (begin (game-proc  name  (hash-remove data 'type)) ))		
                         ((hash-table ('type "draw") ) (begin (draw-proc  name  (hash-remove data 'type)) ))	
                         ((hash-table ('type "message") ) (begin (message-proc  name  (hash-remove data 'type)) ))
                         ((hash-table ('type "room") ) (begin (room-proc  name  (hash-remove data 'type)) ))
                         ("ping" (begin (ws-send! client "pong")
                                        ))
                         ((? eof-object?) (begin (closed-proc name client "timeout")(close))) 
                         (else  (display rec)))))))
        (loop private-status)))  )
  )
(define (origin-proc client params)
  (define username (extract-binding/single 'username params))
  (define password (extract-binding/single 'password params))
  (define host (extract-binding/single 'host params))
  (define origin (extract-binding/single 'origin params))
  (if (not (equal? origin host))       
               
      (begin (ws-send! client (jsexpr->string
                               `#hasheq((type . "account")
                                        (type2 . "login")
                                        (content . #hasheq((name . "origin-problem")
                                                           (status . "not-same-origin"))))))
             (ws-close! client ))
      (let ((name (login client `#hasheq((name . ,username)))))
        (if (void? name)
            '()
            (proc client (list (cons 'name name)))))))

(ws-idle-timeout 53)

(define (websocket-serve ws-port static-port)
  (ws-serve
   #:port ws-port
   #:listen-ip #f 
   #:conn-headers
   (lambda (byte headers req)
     (define headers (request-headers req))
     (define bindings (request-bindings req))
     (define host
       (string-replace
        (extract-binding/single 'host headers)
        (regexp (string-append ":" (number->string ws-port) "$")) ""))
     (define origin
       (string-replace
        (extract-binding/single 'origin headers)
        (regexp (string-append "^https?://|:" (number->string static-port))) ""))
   
     (define username
       (with-handlers ((exn:fail? (lambda (e) '())))
         (extract-binding/single 'username bindings)))
   
     (define password
       (with-handlers ((exn:fail? (lambda (e) '())))
         (extract-binding/single 'username bindings)))
     (values '() (list (cons 'origin origin)
                       (cons 'host host)
                       (cons 'username username)
                       (cons 'password password)) ))
   origin-proc))
;
(provide websocket-serve static-serve)


