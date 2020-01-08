#lang racket
(require "public-defines.rkt")
#;(define (obs-hash hashtable fun proc)  ;大概要没用了  
  "hashtable在fun执行后如果变化，就执行proc"
  (define old-hash-code (equal-hash-code hashtable))
  (begin0 (fun)
         ; (display old-hash-code)
          (if (equal? old-hash-code (equal-hash-code hashtable))
              (void)
              (proc))))
(define (obs-hash get-hash fun proc)  
  " (get-hash) 因为是不可变 需要一个取得的方法
hashtable在满足条件后执行后如果变化，就执行(proc old new)"
  ;甚至还可以调用自己，req携程ws步骤 内部都不用loop了， 不应该这样，混合过于严重，定时器方法和方法劫持不能携程一个函数吗
 ; 如果用法信号多线程方法，需要自己独立一个状态，保存之前的，为什么输入法只能输入第一个词 现在的方法也可以把sleep当req过程，单独里线程
  (define old-hash (get-hash))
  (begin0 (fun)
          (if (equal? old-hash (get-hash))
              (void)
              (proc old-hash (get-hash)))));不需要临时变量 大概 中途变了点问题也不大，而且这个步骤没有什么小号吧
#;(define (broadcast-if-room-status-modify fun)
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
(define (obs-proc old-hash new-hash)
  1)
(define (obs fun)
  (obs-hash root fun obs-proc))
(provide obs)