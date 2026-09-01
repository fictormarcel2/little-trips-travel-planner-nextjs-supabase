import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

type FieldOwnProps = {
  id: string;
  label: string;
  /** Supporting copy rendered under the control and wired to aria-describedby. */
  hint?: string;
  /** Error copy; also flips aria-invalid and the control's border. */
  error?: string;
  /** Applied to the wrapper. */
  className?: string;
  /** Applied to the control, on top of `.input-field`. */
  controlClassName?: string;
};

/** Keys Field owns and therefore never forwards to the underlying control. */
type FieldOwnKeys = keyof FieldOwnProps | "as" | "controlRef";

/**
 * The ref lands on the rendered control, not on the wrapper — needed by
 * anything that has to hand the raw DOM node to a third party, which for this
 * app means the Google Places Autocomplete widget attaching itself to the
 * place-name input. Declared per union branch rather than once on
 * FieldOwnProps so each element type keeps its own ref type with no cast.
 */
export type FieldProps =
  | (FieldOwnProps & { as?: "input"; controlRef?: Ref<HTMLInputElement> } & Omit<
        InputHTMLAttributes<HTMLInputElement>,
        FieldOwnKeys
      >)
  | (FieldOwnProps & { as: "textarea"; controlRef?: Ref<HTMLTextAreaElement> } & Omit<
        TextareaHTMLAttributes<HTMLTextAreaElement>,
        FieldOwnKeys
      >)
  | (FieldOwnProps & { as: "select"; controlRef?: Ref<HTMLSelectElement> } & Omit<
        SelectHTMLAttributes<HTMLSelectElement>,
        FieldOwnKeys
      >);

/**
 * Strips Field's own props so the remainder can be spread onto the control.
 * Generic rather than hand-listed so each branch below keeps the precise
 * attribute type of the element it renders.
 */
function controlPropsOf<T extends FieldOwnProps & { as?: string; controlRef?: unknown }>(
  props: T
) {
  const { as, id, label, hint, error, className, controlClassName, controlRef, ...control } =
    props;
  return control;
}

export function Field(props: FieldProps) {
  const { id, label, hint, error, className = "", controlClassName = "" } = props;

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  // Error first: when both are present, the problem should be announced
  // before the general guidance.
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  const shared = {
    id,
    className: ["input-field", error ? "border-critical" : "", controlClassName]
      .filter(Boolean)
      .join(" "),
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  };

  let control: ReactNode;
  if (props.as === "textarea") {
    control = <textarea {...controlPropsOf(props)} {...shared} ref={props.controlRef} />;
  } else if (props.as === "select") {
    control = <select {...controlPropsOf(props)} {...shared} ref={props.controlRef} />;
  } else {
    control = <input {...controlPropsOf(props)} {...shared} ref={props.controlRef} />;
  }

  return (
    <div className={["flex flex-col gap-1.5", className].filter(Boolean).join(" ")}>
      <label htmlFor={id} className="text-label font-semibold text-secondary">
        {label}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-label text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-label font-semibold text-critical">
          {error}
        </p>
      )}
    </div>
  );
}
