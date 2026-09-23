## 3.3.2 A 3D Kinematic Chain

|     |
| --- |
| ![\begin{figure}\begin{center} \begin{tabular}{ccc} \psfig{file=figs/revolute.eps,... ...Degrees of Freedom & 3 Degrees of Freedom \end{tabular}\end{center} \end{figure}](https://lavalle.pl/planning/img877.gif) |

**Figure 3.12:**
Types of 3D joints arising from the 2D
surface contact between two bodies.

As for a single rigid body, the 3D case is significantly more
complicated than the 2D case due to 3D rotations. Also, several more
types of joints are possible, as shown in Figure [3.12](https://lavalle.pl/planning/node109.html#fig:joints).
Nevertheless, the main ideas from the transformations of 2D kinematic
chains extend to the 3D case. The following steps from Section
[3.3.1](https://lavalle.pl/planning/node106.html#sec:2dchain) will be recycled here:

1. The body frame must be carefully placed for each ![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif).

2. Based on joint relationships, several parameters are measured.

3. The parameters define a homogeneous transformation matrix,
   ![$ T_i$](https://lavalle.pl/planning/img861.gif).

4. The location in ![$ {\cal W}$](https://lavalle.pl/planning/img22.gif) of any point in ![$ {\cal A}_m$](https://lavalle.pl/planning/img847.gif) is given by applying
   the matrix ![$ T_1 T_2 \cdots T_m$](https://lavalle.pl/planning/img878.gif).


|     |
| --- |
| ![\begin{figure}\centerline{\psfig{file=figs/glink.eps,width=5.0truein}}\end{figure}](https://lavalle.pl/planning/img879.gif) |

**Figure 3.13:**
The rotation axes for a generic link
attached by revolute joints.

|     |
| --- |
| ![\begin{figure}\centerline{\psfig{file=figs/dh1.eps,width=2.7truein}}\end{figure}](https://lavalle.pl/planning/img880.gif) |

**Figure 3.14:**
The rotation axes of the generic links are skew lines in ![$ {\mathbb{R}}^3$](https://lavalle.pl/planning/img23.gif).

Consider a kinematic chain of ![$ m$](https://lavalle.pl/planning/img112.gif) links in ![$ {\cal W}= {\mathbb{R}}^3$](https://lavalle.pl/planning/img640.gif), in which each
![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif) for ![$ 1 \leq i < m$](https://lavalle.pl/planning/img659.gif) is attached to ![$ {\cal A}_{i+1}$](https://lavalle.pl/planning/img18.gif) by a revolute
joint. Each link can be a complicated, rigid body as shown in Figure
[3.13](https://lavalle.pl/planning/node109.html#fig:glink). For the 2D problem, the coordinate frames were based
on the points of attachment. For the 3D problem, it is convenient to
use the axis of rotation of each revolute joint (this is
equivalent to the point of attachment for the 2D case). The axes of
rotation will generally be skew lines in ![$ {\mathbb{R}}^3$](https://lavalle.pl/planning/img23.gif), as shown in Figure
[3.14](https://lavalle.pl/planning/node109.html#fig:glinkaxes). Let the ![$ z_i$](https://lavalle.pl/planning/img28.gif)-axis be the axis of rotation for
the revolute joint that holds ![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif) to ![$ {\cal A}_{i-1}$](https://lavalle.pl/planning/img17.gif). Between
each pair of axes in succession, let the ![$ x_i$](https://lavalle.pl/planning/img855.gif)-axis join the closest
pair of points between the ![$ z_i$](https://lavalle.pl/planning/img28.gif)\- and ![$ z_{i+1}$](https://lavalle.pl/planning/img881.gif)-axes, with the origin
on the ![$ z_i$](https://lavalle.pl/planning/img28.gif)-axis and the direction pointing towards the nearest point
of the ![$ z_{i+1}$](https://lavalle.pl/planning/img881.gif)-axis. This axis is uniquely defined if the ![$ z_i$](https://lavalle.pl/planning/img28.gif)-
and ![$ z_{i+1}$](https://lavalle.pl/planning/img881.gif)-axes are not parallel. The recommended body frame for
each ![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif) will be given with respect to the ![$ z_i$](https://lavalle.pl/planning/img28.gif)\- and ![$ x_i$](https://lavalle.pl/planning/img855.gif)-axes,
which are shown in Figure [3.14](https://lavalle.pl/planning/node109.html#fig:glinkaxes). Assuming a
right-handed coordinate system, the ![$ y_i$](https://lavalle.pl/planning/img882.gif)-axis points away from us in
Figure [3.14](https://lavalle.pl/planning/node109.html#fig:glinkaxes). In the transformations that will appear
shortly, the coordinate frame given by ![$ x_i$](https://lavalle.pl/planning/img855.gif), ![$ y_i$](https://lavalle.pl/planning/img882.gif), and ![$ z_i$](https://lavalle.pl/planning/img28.gif) will
be most convenient for defining the model for ![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif). It might not
always appear convenient because the origin of the frame may even lie
outside of ![$ {\cal A}_i$](https://lavalle.pl/planning/img15.gif), but the resulting transformation matrices will be
easy to understand.

|     |
| --- |
| ![\begin{figure}\begin{center} \begin{tabular}{cc} \psfig{file=figs/dh3.eps,width=... ...le=figs/dh5.eps,width=2cm} \\ (c) & (d) \end{tabular}\end{center} \end{figure}](https://lavalle.pl/planning/img883.gif) |

**Figure 3.15:**
Definitions of the four DH parameters: ![$ d_i$](https://lavalle.pl/planning/img24.gif),
![$ \theta _i$](https://lavalle.pl/planning/img25.gif), ![$ a_{i-1}$](https://lavalle.pl/planning/img26.gif), ![$ \alpha _{i-1}$](https://lavalle.pl/planning/img27.gif). The ![$ z_i$](https://lavalle.pl/planning/img28.gif)\- and ![$ x_{i-1}$](https://lavalle.pl/planning/img29.gif)-axes
in (b) and (d), respectively, are pointing outward. Any parameter may be
positive, zero, or negative.

In Section [3.3.1](https://lavalle.pl/planning/node106.html#sec:2dchain), each ![$ T_i$](https://lavalle.pl/planning/img861.gif) was defined in terms of two
parameters, ![$ a_{i-1}$](https://lavalle.pl/planning/img26.gif) and ![$ \theta _i$](https://lavalle.pl/planning/img25.gif). For the 3D case, four
parameters will be defined: ![$ d_i$](https://lavalle.pl/planning/img24.gif), ![$ \theta _i$](https://lavalle.pl/planning/img25.gif), ![$ a_{i-1}$](https://lavalle.pl/planning/img26.gif), and
![$ \alpha _{i-1}$](https://lavalle.pl/planning/img27.gif). These are referred to as _Denavit-Hartenberg (DH)_
_parameters_ \[ [434](https://lavalle.pl/planning/node858.html#HarDen55)\]. The
definition of each parameter is indicated in Figure [3.15](https://lavalle.pl/planning/node109.html#fig:dh).
Figure [3.15](https://lavalle.pl/planning/node109.html#fig:dh) a shows the definition of ![$ d_i$](https://lavalle.pl/planning/img24.gif). Note that the
![$ x_{i-1}$](https://lavalle.pl/planning/img29.gif)\- and ![$ x_i$](https://lavalle.pl/planning/img855.gif)-axes contact the ![$ z_i$](https://lavalle.pl/planning/img28.gif)-axis at two different
places. Let ![$ d_i$](https://lavalle.pl/planning/img24.gif) denote signed distance between these points of
contact. If the ![$ x_i$](https://lavalle.pl/planning/img855.gif)-axis is above the ![$ x_{i-1}$](https://lavalle.pl/planning/img29.gif)-axis along the
![$ z_i$](https://lavalle.pl/planning/img28.gif)-axis, then ![$ d_i$](https://lavalle.pl/planning/img24.gif) is positive; otherwise, ![$ d_i$](https://lavalle.pl/planning/img24.gif) is negative. The
parameter ![$ \theta _i$](https://lavalle.pl/planning/img25.gif) is the angle between the ![$ x_i$](https://lavalle.pl/planning/img855.gif)\- and
![$ x_{i-1}$](https://lavalle.pl/planning/img29.gif)-axes, which corresponds to the rotation about the ![$ z_i$](https://lavalle.pl/planning/img28.gif)-axis
that moves the ![$ x_{i-1}$](https://lavalle.pl/planning/img29.gif)-axis to coincide with the ![$ x_i$](https://lavalle.pl/planning/img855.gif)-axis. The
parameter ![$ a_i$](https://lavalle.pl/planning/img874.gif) is the distance between the ![$ z_i$](https://lavalle.pl/planning/img28.gif)\- and ![$ z_{i-1}$](https://lavalle.pl/planning/img884.gif)-axes;
recall these are generally skew lines in ![$ {\mathbb{R}}^3$](https://lavalle.pl/planning/img23.gif). The parameter
![$ \alpha _{i-1}$](https://lavalle.pl/planning/img27.gif) is the angle between the ![$ z_i$](https://lavalle.pl/planning/img28.gif)\- and ![$ z_{i-1}$](https://lavalle.pl/planning/img884.gif)-axes.

* * *

**Subsections**

- [Two screws](https://lavalle.pl/planning/node110.html)
- [The homogeneous transformation matrix](https://lavalle.pl/planning/node111.html)

Steven M LaValle
2020-08-14
