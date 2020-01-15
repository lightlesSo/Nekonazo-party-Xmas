#lang racket
(require net/rfc6455)
(require json)
(require "public-defines.rkt")
(require web-server/private/timer)
(define (get-timelimit room drawname)
  18)


(define (after-a-turn room)
  
  (begin
    (init-room room)
	(define namelist (room->namelist room))
    (map (lambda (name) ((lock-one-name name)(thunk(begin (update-status! name 'gamestate "ready")
                               ))))
         namelist)
    (start-game room)
  ))
(define (guess-proc name guess-message)
  (define room (hash-ref (hash-ref (name-status) name) 'room))
  (define this-room-status (hash-ref (room-status) room)) 
  (define nazo-word (hash-ref (hash-ref this-room-status 'nazo) 'nazo))
  (define draw-name (hash-ref this-room-status 'drawname))
    (if (equal? guess-message nazo-word)
        (begin
          (room-broadcast name "game" "guessright" `#hasheq((drawname . ,(symbol->string draw-name))(guessrightname . ,(symbol->string name))))
          (after-a-turn room)
          )
        '()))
(define (timeup-proc room)
  (define namelist (room->namelist room))
  (begin
    (map (lambda (name) (begin 
                          (ws-send! (name->client name)
                                    (jsexpr->string `#hasheq((type . "game")
                                                             (type2 . "timeup")
                                                             (content . ,`#hasheq((rightword . ,(hash-ref (hash-ref (hash-ref (room-status) room) 'nazo) 'nazo)))))))))
         namelist)
    (after-a-turn room)
    ))
(define (set-gametimer room time-limit) 

  (define game-timer (start-timer
                 (start-timer-manager)
                 time-limit
                 (lambda () 
                   (timeup-proc room)
                   )))
  #;(hash-set! (hash-ref (room-status) room) 'gametimer game-timer )
  (room-status (hash-update (room-status) room (lambda (status) (hash-set status 'gametimer game-timer)))))
(define (send-ready name send-to)
  (define content `#hasheq((name . ,(symbol->string name))(gamestate . ,(hash-ref (name->status name) 'gamestate "unknown"))))
  (ws-send! (name->client send-to) (jsexpr->string `#hasheq((type . "game")(type2 . "getReady")(content . ,content)))))

(define (start-game room )
(if (let/cc cc ((lock-one-room room) (thunk
  (define namelist (room->namelist room ))
  (if (or (findf (lambda(name)  (equal? (hash-ref (hash-ref (name-status) name) 'gamestate) "notready"))
             namelist)
		  (equal? "game"(hash-ref (hash-ref (room-status) room) 'gamestate)))
      '()
      (let*((this-room-status (hash-ref (room-status) room))
            (drawn-list (hash-ref this-room-status 'drawnlist '()))
            (notdrawn-list (remove* drawn-list namelist))
            (optional-namelist (if (null? notdrawn-list)
                                   namelist
                                   notdrawn-list))
            (drawname (car optional-namelist))
            (new-drawn-list (if (null? notdrawn-list)
                                   (list drawname)
                                   (cons drawname drawn-list)))
            ( guessnames (remove drawname namelist))
            (time-limit  (get-timelimit room drawname))
            (nazo (vector-ref nazo-words-list (random nazo-words-list-length (make-pseudo-random-generator))))
            (pubcontent `#hasheq( (timelimit . ,time-limit) ))
            (drawcontent (hash-set* pubcontent 'gamestate  "draw" 'nazo nazo 'drawname (symbol->string drawname)))
            (guesscontent (hash-set* pubcontent 'gamestate  "guess"
                                     'nazo (hash-remove nazo 'nazo)
                                     'drawname (symbol->string drawname))))
        (begin ;(hash-set! this-room-status 'gamestate "game")
               ;(hash-set! this-room-status 'nazo nazo)
               ;(hash-set! this-room-status 'drawname drawname)
               ;(hash-set! this-room-status 'drawnlist new-drawn-list)
          (room-status (hash-update (room-status) room
                                    (lambda (status)
                                      (hash-set* status
                                                 'gamestate "game"
                                                 'nazo nazo
                                                 'drawname drawname
                                                 'drawnlist new-drawn-list))))  ;(cc (start-game room))不可行,因为要先算函数值,而那个需要锁 还没调cc没解锁
               ((lock-one-name drawname) (thunk(update-status! drawname 'gamestate "draw"))  (thunk (cc #f)) #;(unlock-one-room room cc (thunk(start-game room))) )
               (ws-send! (name->client drawname)
                         (jsexpr->string `#hasheq((type . "game")
                                                  (type2 . "gameStart")
                                                  (content . ,drawcontent))))
               
               (map (lambda(guessname)
                      (begin ((lock-one-name guessname) (thunk(update-status! guessname 'gamestate "guess")) (thunk (cc #f)))
                            (ws-send! (name->client guessname)
                                      (jsexpr->string `#hasheq((type . "game")
                                                               (type2 . "gameStart")
                                                               (content . ,guesscontent))))
                            ))
                    guessnames)
               (set-gametimer room time-limit)))))))
			   (void)
			   (start-game room)))
(define (game-proc name data)
  (match data
    ((hash-table  ('type2 "getReady") ('content content-json))
     #:when(equal? (hash-ref (hash-ref (name-status) name) 'state) "room")
     (begin (define namelist (room->namelist (hash-ref (hash-ref (name-status) name) 'room)))
            (map (lambda(x) (send-ready x name)) namelist)))
    ((hash-table ('type2 "setReady") ('content content-json))
     #:when(equal? (hash-ref (hash-ref (name-status) name) 'state) "room")
     (begin (define namelist (room->namelist (hash-ref (hash-ref (name-status) name) 'room)))
           ((lock-one-name name)( thunk(update-status! name 'gamestate (hash-ref content-json 'gamestate)))) ;这用枷锁吗，只有自己能改，而且同时只有一个登录
            (map (lambda(x)(send-ready name x)) namelist)
            (start-game (hash-ref (hash-ref (name-status) name) 'room) )))
    ((hash-table  ('type2 "getDrawStack") ('content content-json)) 
     #:when(equal? (hash-ref (hash-ref (name-status) name) 'state) "room")
     (begin 
       (define room (hash-ref (hash-ref (name-status) name) 'room))
       (define this-room-status (hash-ref (room-status) room ))
       (define steps (hash-ref this-room-status 'drawsteps))
       (ws-send! (name->client name)
                 (jsexpr->string `#hasheq((type . "game")
                                          (type2 . "gameStart")
                                          (content . ,(make-immutable-hash
                                                       (list (cons 'timelimit (round (/ (- (timer-expire-seconds (hash-ref this-room-status 'gametimer)) (current-inexact-milliseconds)) 1000))) 
                                                             (cons 'gamestate  "guess")
                                                             (cons 'nazo (hash-remove (hash-ref this-room-status 'nazo) 'nazo))
                                                             (cons 'drawname (symbol->string (hash-ref this-room-status 'drawname)))))))))
       (ws-send! (name->client name)
                 (jsexpr->string `#hasheq((type . "draw")
                                          (type2 . "lineTo")
                                          (content . ,(list steps
                                                            0
                                                            (- (length steps) 1)))))
                 )))
     ))
(provide game-proc guess-proc)