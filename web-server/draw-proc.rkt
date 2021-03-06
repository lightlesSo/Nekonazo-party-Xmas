#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt")
(define (send-lineTo content client) 
  (ws-send! client (jsexpr->string `#hasheq((type . "draw")(type2 . "lineTo")(content . ,content)))))
(define (broadcast-lineTo name content)
  (begin
    (map (lambda (x)(send-lineTo content (name->client x))) (remove name (room->namelist (hash-ref (hash-ref (name-status) name) 'room))))
    (ws-send! (name->client name) "sendDrawStepsSuccess")))
(define (draw-proc name data)
  #;(match data 
      ((hash-table  ('type2 "lineTo") ('content content-json))
       #:when(and (equal? (hash-ref (hash-ref (name-status) name) 'state) "room") (equal? (hash-ref (hash-ref (name-status) name) 'gamestate) "draw"))
       (begin
         (hash-update! (hash-ref (room-status) (hash-ref (hash-ref (name-status) name) 'room) (hash)) 'drawsteps (lambda (x) (append x (car content-json) )) #;'())
         (broadcast-lineTo name content-json) ))
      )
	;  (displayln data)
  (define content-json (hash-ref data 'content))
  (define type2 (hash-ref data 'type2))
	
  (case type2
    (("lineTo") (if (and (equal? (hash-ref (hash-ref (name-status) name) 'state) "room") (equal? (hash-ref (hash-ref (name-status) name) 'gamestate) "draw"))
                  (begin
                    (let ((room (hash-ref (hash-ref (name-status) name) 'room)))
                    #;(hash-update! (hash-ref (room-status) room (hash)) 'drawsteps (lambda (x) (append  (reverse (car content-json)) x )) )
					;(display room)
                      ((lock-one-room room)(thunk(room-status (hash-update (room-status) room (lambda (status)
                                                                     (hash-update status 'drawsteps (lambda(steps)
                                                                                                      (append (car content-json) steps)))))))))
                    ;步骤是reverse保存单独
                    (broadcast-lineTo name content-json) )
                  '())))
  )
(provide draw-proc)