# Chapter 4

<!-- 引入选项引用；第1题选中的字母 B 与其选项内容 D 不同。 -->
## Example 4-1

@question 1 D
A: B
B: D
C: A
D: E
E: C

@question 2 B
A: A
B: C
C: ref(1)
D: D
E: E

@revealed BC
@solution BC

<!-- 两边都要同时成立；不能只看某一个可满足的选项。 -->
## Q4-1

@question 1 C
A: ref(2)
B: B
C: D
D: A
E: E

@question 2 A
A: ref(1)
B: C
C: A
D: E
E: B

@solution AC

<!-- 重复引用产生不同的选项标签；旧计数机制区分两个看似相同的选项。 -->
## Q4-2

@question 1 D
A: ref(2)
B: ref(3)
C: ref(2)
D: B
E: C

@question 2 C
A: E
B: A
C: B
D: C
E: D

@question 3 #A
A: 0
B: 1
C: 2
D: 3
E: 4

@solution ADB

<!-- 左右相同的引用比较答案字母，不要求本题复制被引用题的答案。 -->
## Example 4-2

@question 1 ref(2)
A: ref(1)
B: ref(2)
C: ref(3)
D: A
E: E

@question 2 D
A: A
B: B
C: D
D: E
E: C

@question 3 #C
A: 1
B: 2
C: 0
D: 3
E: 4

@revealed BCA
@solution BCA

<!-- 自引用不需要递归读取选项内容；局部恒真的选项仍受全组约束。 -->
## Q4-3

@question 1 ref(1)
A: ref(2)
B: ref(2)
C: ref(1)
D: ref(3)
E: ref(3)

@question 2 #ref(1)
A: 3
B: 3
C: 2
D: 1
E: 3

@question 3 ref(2)
A: B
B: C
C: D
D: E
E: A

@solution CCB

<!-- E 只能成对出现；引用和计数共同排除自指与重复引用造成的候选。 -->
## Q4-4

@question 1 E
A: ref(3)
B: ref(4)
C: ref(1)
D: ref(2)
E: ref(2)

@question 2 E
A: ref(4)
B: ref(2)
C: ref(3)
D: ref(1)
E: ref(1)

@question 3 ref(4)
A: ref(1)
B: ref(3)
C: ref(2)
D: ref(4)
E: A

@question 4 #E
A: 0
B: 1
C: 2
D: 3
E: 4

@solution EEDC

<!-- 四题闭环：先证明两题不同，再用频数区分相同引用。 -->
## Q4-A

@question 1 ref(2)
A: A
B: E
C: B
D: A
E: C

@question 2 ref(1)
A: ref(4)
B: C
C: ref(3)
D: ref(2)
E: ref(4)

@question 3 ref(1)
A: ref(2)
B: ref(4)
C: ref(3)
D: ref(2)
E: ref(4)

@question 4 #ref(3)
A: 0
B: 1
C: 2
D: 3
E: 4

@solution CBBC

<!-- 六题：两个问号由已出现的频数和剩余位置容量共同锁定。 -->
## Q4-B

@question 1 ref(2)
A: A
B: E
C: B
D: A
E: C

@question 2 ref(1)
A: ref(4)
B: C
C: ref(3)
D: ref(2)
E: ref(4)

@question 3 ref(1)
A: ref(2)
B: ref(4)
C: ref(2)
D: ref(2)
E: ref(4)

@question 4 #ref(3)
A: 0
B: 1
C: 4
D: 5
E: 6

@question 5 ?
A: ?
B: ?
C: ?
D: ?
E: ?

@question 6 ?
A: ?
B: ?
C: ?
D: ?
E: ?

@solution CBBCBB
