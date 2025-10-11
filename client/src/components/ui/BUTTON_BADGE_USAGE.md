# Button & Badge Usage Guide

## 🎨 Design System: Seed Branding

### Color Variants

| Variant               | Color          | Use Case                        | Theme-Aware     |
| --------------------- | -------------- | ------------------------------- | --------------- |
| **Default** (Primary) | 🔥 Seed Orange | Primary actions, CTAs           | No - consistent |
| **Secondary**         | 🌊 Seed Teal   | Secondary actions, alternatives | Yes - adapts    |
| **Destructive**       | 🔴 Red         | Delete, dangerous actions       | No              |
| **Outline**           | Border only    | Tertiary actions                | Yes             |
| **Ghost**             | Transparent    | Subtle actions                  | Yes             |

---

## 📝 Button Usage

### Primary Actions (Orange - Default)

```tsx
// No variant needed - defaults to seed-orange
<Button>Create Account</Button>
<Button size="sm">Save</Button>
<Button size="lg">Get Started</Button>
<Button size="icon"><Plus /></Button>
```

### Secondary Actions (Teal)

```tsx
<Button variant="secondary">Learn More</Button>
<Button variant="secondary"><Download />Export</Button>
<Button variant="secondary" size="sm">Cancel</Button>
```

### Destructive Actions

```tsx
<Button variant="destructive">Delete</Button>
<Button variant="destructive"><Trash2 />Remove</Button>
```

### Outlined Actions

```tsx
<Button variant="outline">Cancel</Button>
<Button variant="outline">Go Back</Button>
```

### Common Patterns

```tsx
// Form actions
<div className="flex gap-2 justify-end">
  <Button variant="outline">Cancel</Button>
  <Button>Save Changes</Button>
</div>

// Action bar
<div className="flex gap-2">
  <Button><Plus />Create</Button>
  <Button variant="secondary"><Download />Export</Button>
  <Button variant="outline"><Settings />Settings</Button>
</div>

// Danger zone
<div className="flex gap-2">
  <Button variant="outline">Cancel</Button>
  <Button variant="destructive"><Trash2 />Delete Account</Button>
</div>
```

---

## 🏷️ Badge Usage

### Status Indicators (Orange - Default)

```tsx
// No variant needed - defaults to seed-orange
<Badge>Premium</Badge>
<Badge>Featured</Badge>
<Badge>New</Badge>
<Badge>5</Badge>
```

### Verification/Trust (Teal)

```tsx
<Badge variant="secondary">Verified</Badge>
<Badge variant="secondary">Active</Badge>
<Badge variant="secondary">Trusted</Badge>
```

### Errors/Alerts

```tsx
<Badge variant="destructive">Failed</Badge>
<Badge variant="destructive">Overdue</Badge>
<Badge variant="destructive">Critical</Badge>
```

### Neutral States

```tsx
<Badge variant="outline">Draft</Badge>
<Badge variant="outline">Pending</Badge>
<Badge variant="outline">Archived</Badge>
```

### Common Patterns

```tsx
// User profile
<div className="flex items-center gap-2">
  <Avatar />
  <span>John Doe</span>
  <Badge>Pro</Badge>
  <Badge variant="secondary">Verified</Badge>
</div>

// Data rows
<TableRow>
  <TableCell>Lead #1234</TableCell>
  <TableCell>
    <Badge>Hot Lead</Badge>
  </TableCell>
  <TableCell>
    <Badge variant="secondary">Qualified</Badge>
  </TableCell>
</TableRow>

// Count indicators
<Button variant="outline" className="relative">
  Notifications
  <Badge className="absolute -top-2 -right-2">12</Badge>
</Button>
```

---

## 🌓 Theme Behavior

### Light Mode

- **Primary (Orange)**: Deep fire gradient
- **Secondary (Teal)**: Dark teal → Light teal

### Dark Mode

- **Primary (Orange)**: Same deep fire gradient
- **Secondary (Teal)**: Light teal → Dark teal (reversed & softer)

The secondary variant **automatically adapts** to light/dark theme for optimal contrast.

---

## 🎯 Best Practices

1. **Use Primary for CTAs**: Main actions should use the default orange
2. **Use Secondary for Alternatives**: Non-primary actions use teal
3. **Don't Mix Too Many**: Limit to 2-3 button variants per screen
4. **Badge Hierarchy**: Use orange for important statuses, teal for trust/verification
5. **Consistent Sizing**: Match button sizes in action groups
6. **Icon Clarity**: Always pair destructive actions with clear icons

---

## 🚀 Migration from Old Components

### Before (old blue primary)

```tsx
<Button variant="default">Click Me</Button>
```

### After (new orange default)

```tsx
<Button>Click Me</Button>
```

### Before (old gray secondary)

```tsx
<Button variant="secondary">Secondary</Button>
```

### After (new teal secondary)

```tsx
<Button variant="secondary">Secondary</Button>
```

**Note**: The variants stay the same, but the colors now match Seed branding! 🎨
