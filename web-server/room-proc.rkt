#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt")
(define (remove-room room)
  (define rooms-namelist 
	(filter string?
		(hash-map name-status 
		  (lambda (key value) 
			(if (equal? "rooms" (hash-ref value 'state '()))
				key
				'())))))
  (begin 
    (broadcast-json rooms-namelist "room" "removeroom" `#hasheq((room . ,room)))
	(hash-remove! room-status room)))
(define (newroom room)
  (if (hash-has-key? room-status room)
	#f
   (hash-set! room-status room (make-hash '((names . ())(drawsteps . ())(gamestate . "ready"))))))
(define (addroom name room)
  (newroom room))
(define (send-current-rooms name)
  (define (oneroomstatus key value)
	  (make-hash (list (cons 'room key) 
	(cons 'peoplenum (length (hash-ref value 'names)))	  
	(cons 'roomstatus (hash-ref value 'gamestate)))))
  (define roomsstatus (hash-map  room-status oneroomstatus))
  ;  racket 在key为数字时 jsexpr->string会失败
  (send-json name "room" "currentrooms" `#hasheq((roomlist . ,roomsstatus))))
(define (room-proc name data)
  (match data
	((hash-table  ('type2 "addroom") ('content content-json)) (addroom name (hash-ref content-json 'room)))
	((hash-table  ('type2 "getcurrentrooms") ('content content-json)) (send-current-rooms name )) 
	))
(provide room-proc)